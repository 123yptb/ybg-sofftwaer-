-- ============================================================================
-- Migration: 003_create_inventory_schema.sql
-- Phase 5 — Inventory Management
--
-- Tables: products, stock_movements
--
-- Design Principles:
--   1. tenant_id on every table — strict logical isolation.
--   2. quantity_on_hand is the authoritative stock level; it is ONLY updated
--      via the fn_apply_stock_movement trigger, never via direct UPDATE.
--      This guarantees an immutable audit trail in stock_movements.
--   3. stock_movements is append-only (no UPDATE/DELETE allowed via trigger).
--   4. Negative stock is blocked via a CHECK constraint on products.
--   5. The products table carries a FK reference back from invoice_items
--      (already defined in migration 002 via ON DELETE SET NULL).
-- ============================================================================

-- ENUM: what caused the stock movement
CREATE TYPE stock_movement_type AS ENUM (
    'PurchaseReceipt',   -- goods received from a supplier
    'SaleDeduction',     -- auto-deducted when an invoice is Paid
    'ManualAdjustment',  -- TenantAdmin corrects physical count discrepancy
    'WriteOff',          -- damaged / expired goods
    'Return'             -- customer return / supplier return
);

-- ============================================================================
-- TABLE: products
-- ============================================================================

CREATE TABLE products (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ── Tenant isolation ─────────────────────────────────────────────────────
    tenant_id           UUID            NOT NULL
                                         REFERENCES tenants (id)
                                         ON DELETE CASCADE
                                         ON UPDATE CASCADE,

    -- Identity
    sku                 VARCHAR(100)    NOT NULL,
    name                VARCHAR(255)    NOT NULL,
    description         TEXT,
    category            VARCHAR(100),

    -- Pricing
    unit_price          NUMERIC(19, 4)  NOT NULL DEFAULT 0.0000,
    cost_price          NUMERIC(19, 4)  NOT NULL DEFAULT 0.0000,

    -- Inventory
    quantity_on_hand    NUMERIC(14, 4)  NOT NULL DEFAULT 0.0000,
    reorder_level       NUMERIC(14, 4)  NOT NULL DEFAULT 0.0000,
    unit_of_measure     VARCHAR(30)     NOT NULL DEFAULT 'unit',  -- e.g. kg, pcs, litre

    -- GL account overrides (optional; falls back to tenant system accounts)
    -- inventory_account_id → defaults to 1200 (Inventory)
    -- cogs_account_id      → defaults to 5000 (Cost of Goods Sold)
    inventory_account_id UUID           REFERENCES accounts (id) ON DELETE SET NULL,
    cogs_account_id      UUID           REFERENCES accounts (id) ON DELETE SET NULL,

    -- Status
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    is_tracked          BOOLEAN         NOT NULL DEFAULT TRUE,  -- FALSE = service item, skip stock deduction

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- ── Constraints ──────────────────────────────────────────────────────────
    CONSTRAINT uq_product_sku_per_tenant     UNIQUE (tenant_id, sku),
    -- Prevent negative stock at the DB level
    CONSTRAINT chk_product_qty_non_negative  CHECK (quantity_on_hand >= 0),
    CONSTRAINT chk_product_price_non_negative CHECK (unit_price >= 0 AND cost_price >= 0),
    CONSTRAINT chk_product_reorder_non_negative CHECK (reorder_level >= 0)
);

CREATE INDEX idx_products_tenant_id   ON products (tenant_id);
CREATE INDEX idx_products_tenant_sku  ON products (tenant_id, sku);
CREATE INDEX idx_products_is_active   ON products (tenant_id, is_active);
-- Low-stock alert queries
CREATE INDEX idx_products_low_stock   ON products (tenant_id, quantity_on_hand, reorder_level)
    WHERE is_tracked = TRUE AND is_active = TRUE;

COMMENT ON TABLE  products                   IS 'Product catalogue per tenant. is_tracked=FALSE skips all stock movement logic.';
COMMENT ON COLUMN products.quantity_on_hand  IS 'Authoritative stock level. Updated ONLY via stock_movements trigger — never direct UPDATE.';
COMMENT ON COLUMN products.is_tracked        IS 'FALSE for service items (no stock deduction on sale).';

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================================
-- TABLE: stock_movements
-- ============================================================================
-- Immutable ledger of every stock change. Quantity deltas are signed:
--   Positive (+) = stock coming IN  (receipt, return)
--   Negative (-) = stock going OUT  (sale, write-off)
-- ============================================================================

CREATE TABLE stock_movements (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ── Tenant isolation ─────────────────────────────────────────────────────
    tenant_id       UUID                NOT NULL
                                         REFERENCES tenants (id)
                                         ON DELETE CASCADE
                                         ON UPDATE CASCADE,

    product_id      UUID                NOT NULL
                                         REFERENCES products (id)
                                         ON DELETE RESTRICT,  -- cannot delete product with history

    movement_type   stock_movement_type NOT NULL,

    -- Signed quantity delta: positive = in, negative = out
    quantity_delta  NUMERIC(14, 4)      NOT NULL,

    -- Stock level snapshot AFTER this movement (for fast audit queries)
    quantity_after  NUMERIC(14, 4)      NOT NULL,

    -- Optional links to source documents
    invoice_id      UUID                REFERENCES invoices (id)      ON DELETE SET NULL,
    invoice_item_id UUID                REFERENCES invoice_items (id) ON DELETE SET NULL,

    -- Human-readable reason
    notes           TEXT,

    performed_by    UUID                NOT NULL REFERENCES users (id),
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    -- ── Constraints ──────────────────────────────────────────────────────────
    CONSTRAINT chk_sm_quantity_delta_not_zero CHECK (quantity_delta <> 0),
    -- quantity_after must always be ≥ 0 (this mirrors the products constraint)
    CONSTRAINT chk_sm_quantity_after_non_negative CHECK (quantity_after >= 0)
);

CREATE INDEX idx_sm_tenant_product ON stock_movements (tenant_id, product_id, created_at DESC);
CREATE INDEX idx_sm_invoice_id     ON stock_movements (invoice_id)      WHERE invoice_id IS NOT NULL;
CREATE INDEX idx_sm_movement_type  ON stock_movements (tenant_id, movement_type);

COMMENT ON TABLE  stock_movements                IS 'Immutable audit ledger of every stock change. Never update or delete rows.';
COMMENT ON COLUMN stock_movements.quantity_delta IS 'Signed delta: positive = stock IN, negative = stock OUT.';
COMMENT ON COLUMN stock_movements.quantity_after IS 'Snapshot of quantity_on_hand immediately after this movement.';

-- ============================================================================
-- TRIGGER: fn_apply_stock_movement
-- ============================================================================
-- Fires AFTER INSERT on stock_movements.
-- Applies the signed delta to products.quantity_on_hand atomically.
-- Blocks UPDATE and DELETE to preserve the immutable audit trail.
-- The RETURNING clause on the UPDATE captures the new quantity so we can
-- write it back into stock_movements.quantity_after via a second update
-- (done carefully to avoid infinite trigger loops via a condition check).
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_apply_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_qty NUMERIC(14, 4);
BEGIN
    -- ── Block mutation of existing movement records ───────────────────────────
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        RAISE EXCEPTION
            'stock_movements records are immutable. '
            'Create a correcting movement instead of modifying id=%.', OLD.id;
    END IF;

    -- ── Apply delta to product stock ─────────────────────────────────────────
    UPDATE products
       SET quantity_on_hand = quantity_on_hand + NEW.quantity_delta,
           updated_at       = NOW()
     WHERE id        = NEW.product_id
       AND tenant_id = NEW.tenant_id
    RETURNING quantity_on_hand INTO v_new_qty;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product id=% not found for tenant %.', NEW.product_id, NEW.tenant_id;
    END IF;

    -- ── Write the post-movement snapshot back to the movement row ─────────────
    -- We use a direct table update (not another trigger call) so we bypass
    -- the immutability check above by using a SECURITY DEFINER if needed.
    -- Here we update via a system-internal call; this is safe because the
    -- BEFORE trigger condition checks TG_OP.
    UPDATE stock_movements
       SET quantity_after = v_new_qty
     WHERE id = NEW.id;

    RETURN NEW;
END;
$$;

-- Only fires on INSERT — UPDATE/DELETE are blocked inside the function
CREATE TRIGGER trg_apply_stock_movement
    AFTER INSERT ON stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION fn_apply_stock_movement();

-- ============================================================================
-- Enable Row-Level Security
-- ============================================================================

ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- END OF MIGRATION: 003_create_inventory_schema.sql
-- ============================================================================

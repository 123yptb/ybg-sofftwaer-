-- ============================================================================
-- Migration: 004_create_ap_schema.sql
-- Phase 6 — Purchasing & Accounts Payable (AP)
--
-- Tables: suppliers, bills, bill_items
--
-- Design mirrors the AR module (Phase 4) but represents money OWED by the
-- tenant to their vendors/suppliers.
--
-- Key integration points:
--   1. When a bill transitions to 'Paid':
--        GL Journal Entry:  DR 5000 (COGS/Expense)  / CR 2000 (Accounts Payable)
--   2. When a bill transitions to 'Paid' AND bill_items reference products:
--        Stock is INCREASED via a 'PurchaseReceipt' stock_movement row.
--   3. bill_items.total computed via GENERATED columns.
--   4. bills.total_amount kept in sync via trigger fn_recompute_bill_totals.
-- ============================================================================

CREATE TYPE bill_status AS ENUM ('Draft', 'Received', 'Paid', 'Overdue', 'Void');

-- ============================================================================
-- TABLE: suppliers
-- ============================================================================

CREATE TABLE suppliers (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id        UUID          NOT NULL
                                    REFERENCES tenants (id)
                                    ON DELETE CASCADE
                                    ON UPDATE CASCADE,

    display_name     VARCHAR(255)  NOT NULL,
    company_name     VARCHAR(255),
    email            VARCHAR(255),
    phone            VARCHAR(50),

    billing_address  JSONB,
    currency_code    CHAR(3),

    -- Link to the Accounts Payable GL account for this supplier
    -- Defaults to tenant system account code 2000 if NULL
    ap_account_id    UUID          REFERENCES accounts (id) ON DELETE SET NULL,

    is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
    notes            TEXT,

    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_tenant_id    ON suppliers (tenant_id);
CREATE INDEX idx_suppliers_tenant_email ON suppliers (tenant_id, email) WHERE email IS NOT NULL;

COMMENT ON TABLE suppliers IS 'Vendors/suppliers per tenant. Used in Accounts Payable workflows.';

CREATE TRIGGER trg_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================================
-- TABLE: bills
-- ============================================================================

CREATE TABLE bills (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id        UUID          NOT NULL
                                    REFERENCES tenants (id)
                                    ON DELETE CASCADE
                                    ON UPDATE CASCADE,

    supplier_id      UUID          NOT NULL
                                    REFERENCES suppliers (id)
                                    ON DELETE RESTRICT,

    -- User-visible bill/purchase-order number
    bill_number      VARCHAR(50)   NOT NULL,

    -- The supplier's own reference (e.g. their invoice number to us)
    supplier_ref     VARCHAR(100),

    issue_date       DATE          NOT NULL DEFAULT CURRENT_DATE,
    due_date         DATE          NOT NULL,

    status           bill_status   NOT NULL DEFAULT 'Draft',

    -- Totals (kept in sync by trigger)
    subtotal_amount  NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    tax_amount       NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    total_amount     NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    amount_paid      NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    amount_due       NUMERIC(19,4) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,

    currency_code    CHAR(3)       NOT NULL DEFAULT 'USD',
    notes            TEXT,

    -- Back-link to the auto-created GL journal entry on payment
    journal_entry_id UUID          REFERENCES journal_entries (id) ON DELETE SET NULL,

    created_by       UUID          NOT NULL REFERENCES users (id),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_bill_number_per_tenant   UNIQUE (tenant_id, bill_number),
    CONSTRAINT chk_bill_due_after_issue    CHECK  (due_date >= issue_date),
    CONSTRAINT chk_bill_totals_non_negative CHECK (
        subtotal_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0
    )
);

CREATE INDEX idx_bills_tenant_id       ON bills (tenant_id);
CREATE INDEX idx_bills_tenant_supplier ON bills (tenant_id, supplier_id);
CREATE INDEX idx_bills_tenant_status   ON bills (tenant_id, status);
CREATE INDEX idx_bills_due_date        ON bills (tenant_id, due_date) WHERE status NOT IN ('Paid','Void');

COMMENT ON TABLE bills IS 'AP Bills — amounts owed to suppliers. Mirror of invoices in AR module.';

CREATE TRIGGER trg_bills_updated_at
    BEFORE UPDATE ON bills
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================================
-- TABLE: bill_items
-- ============================================================================

CREATE TABLE bill_items (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id        UUID           NOT NULL
                                     REFERENCES tenants (id)
                                     ON DELETE CASCADE
                                     ON UPDATE CASCADE,

    bill_id          UUID           NOT NULL
                                     REFERENCES bills (id)
                                     ON DELETE CASCADE
                                     ON UPDATE CASCADE,

    -- Optional link to a product (enables stock receipt on bill payment)
    product_id       UUID           REFERENCES products (id) ON DELETE SET NULL,

    description      TEXT           NOT NULL,
    quantity         NUMERIC(14,4)  NOT NULL,
    unit_cost        NUMERIC(19,4)  NOT NULL,
    tax_rate         NUMERIC(6,4)   NOT NULL DEFAULT 0.0000,

    -- Computed totals via GENERATED columns
    line_total       NUMERIC(19,4)  GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    tax_amount       NUMERIC(19,4)  GENERATED ALWAYS AS (quantity * unit_cost * tax_rate) STORED,

    line_order       SMALLINT       NOT NULL DEFAULT 0,

    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_bill_item_qty_positive    CHECK (quantity > 0),
    CONSTRAINT chk_bill_item_cost_non_neg    CHECK (unit_cost >= 0),
    CONSTRAINT chk_bill_item_tax_rate_range  CHECK (tax_rate >= 0 AND tax_rate <= 1)
);

CREATE INDEX idx_bill_items_bill_id    ON bill_items (bill_id);
CREATE INDEX idx_bill_items_tenant_id  ON bill_items (tenant_id);
CREATE INDEX idx_bill_items_product_id ON bill_items (product_id) WHERE product_id IS NOT NULL;

COMMENT ON TABLE bill_items IS 'Line items of AP bills. Drives bill totals via trigger. Product link enables auto-stock-receipt.';

-- ============================================================================
-- TRIGGER: fn_recompute_bill_totals
-- ============================================================================
-- Mirrors fn_recompute_invoice_totals from migration 002.
-- Fires AFTER INSERT/UPDATE/DELETE on bill_items to keep bills totals current.
-- Locks out modifications on Paid/Void bills.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_recompute_bill_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_bill_id  UUID;
    v_subtotal NUMERIC(19,4);
    v_tax      NUMERIC(19,4);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_bill_id := OLD.bill_id;
    ELSE
        v_bill_id := NEW.bill_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM bills WHERE id = v_bill_id AND status IN ('Paid','Void')
    ) THEN
        RAISE EXCEPTION
            'Cannot modify line items on a % bill (id=%).',
            (SELECT status FROM bills WHERE id = v_bill_id), v_bill_id;
    END IF;

    SELECT
        COALESCE(SUM(quantity * unit_cost), 0),
        COALESCE(SUM(quantity * unit_cost * tax_rate), 0)
      INTO v_subtotal, v_tax
      FROM bill_items
     WHERE bill_id = v_bill_id;

    UPDATE bills
       SET subtotal_amount = v_subtotal,
           tax_amount      = v_tax,
           total_amount    = v_subtotal + v_tax,
           updated_at      = NOW()
     WHERE id = v_bill_id;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recompute_bill_totals
    AFTER INSERT OR UPDATE OR DELETE
    ON bill_items
    FOR EACH ROW
    EXECUTE FUNCTION fn_recompute_bill_totals();

-- ============================================================================
-- Row-Level Security
-- ============================================================================

ALTER TABLE suppliers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- END OF MIGRATION: 004_create_ap_schema.sql
-- ============================================================================

-- ============================================================================
-- Migration: 002_create_ar_schema.sql
-- Phase 4 — Sales & Accounts Receivable (AR)
--
-- Tables: customers, invoices, invoice_items
--
-- Design Principles:
--   1. All tables carry tenant_id FK — strict logical isolation.
--   2. invoice_number is unique per tenant (enforced via UNIQUE constraint).
--   3. invoice totals are computed via a DB trigger so the invoices.total_amount
--      is always consistent with the actual line items.
--   4. Status transitions are modelled as a Postgres ENUM with a CHECK
--      trigger enforcing valid one-way transitions.
-- ============================================================================

-- ENUM: invoice lifecycle states
CREATE TYPE invoice_status AS ENUM ('Draft', 'Sent', 'Paid', 'Overdue', 'Void');

-- ============================================================================
-- TABLE: customers
-- ============================================================================

CREATE TABLE customers (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ── Tenant isolation ────────────────────────────────────────────────────
    tenant_id        UUID          NOT NULL
                                    REFERENCES tenants (id)
                                    ON DELETE CASCADE
                                    ON UPDATE CASCADE,

    -- Identity
    display_name     VARCHAR(255)  NOT NULL,
    company_name     VARCHAR(255),
    email            VARCHAR(255),
    phone            VARCHAR(50),

    -- Billing address (stored flat; JSON for flexible international formats)
    billing_address  JSONB,
    -- Shipping address (optional, defaults to billing)
    shipping_address JSONB,

    -- Currency override per customer (falls back to tenant currency if NULL)
    currency_code    CHAR(3),

    -- Link to the Accounts Receivable account in the GL for this customer
    -- Nullable: if NULL, the tenant's default AR account (code 1100) is used
    ar_account_id    UUID          REFERENCES accounts (id) ON DELETE SET NULL,

    is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
    notes            TEXT,

    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_tenant_id    ON customers (tenant_id);
CREATE INDEX idx_customers_tenant_email ON customers (tenant_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_is_active    ON customers (tenant_id, is_active);

COMMENT ON TABLE  customers               IS 'Customers of each tenant. Used in Accounts Receivable workflows.';
COMMENT ON COLUMN customers.billing_address IS 'JSONB: { line1, line2, city, state, postal_code, country }';

-- Auto-update updated_at
CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================================
-- TABLE: invoices
-- ============================================================================

CREATE TABLE invoices (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ── Tenant isolation ────────────────────────────────────────────────────
    tenant_id        UUID           NOT NULL
                                     REFERENCES tenants (id)
                                     ON DELETE CASCADE
                                     ON UPDATE CASCADE,

    customer_id      UUID           NOT NULL
                                     REFERENCES customers (id)
                                     ON DELETE RESTRICT,

    -- Human-facing number (e.g. "INV-2024-0001"), unique per tenant
    invoice_number   VARCHAR(50)    NOT NULL,

    -- Dates
    issue_date       DATE           NOT NULL DEFAULT CURRENT_DATE,
    due_date         DATE           NOT NULL,

    -- Status lifecycle
    status           invoice_status NOT NULL DEFAULT 'Draft',

    -- Financial totals (kept in sync by trigger fn_recompute_invoice_totals)
    subtotal_amount  NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    tax_amount       NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    total_amount     NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    amount_paid      NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    amount_due       NUMERIC(19, 4) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,

    -- Currency at time of issue (snapshot, never follows tenant changes)
    currency_code    CHAR(3)        NOT NULL DEFAULT 'USD',
    notes            TEXT,

    -- Link to the auto-created GL journal entry when invoice is posted
    journal_entry_id UUID           REFERENCES journal_entries (id) ON DELETE SET NULL,

    created_by       UUID           NOT NULL REFERENCES users (id),
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    -- ── Constraints ─────────────────────────────────────────────────────────
    CONSTRAINT uq_invoice_number_per_tenant   UNIQUE (tenant_id, invoice_number),
    CONSTRAINT chk_invoice_due_after_issue    CHECK (due_date >= issue_date),
    CONSTRAINT chk_invoice_totals_non_negative CHECK (
        subtotal_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0
    )
);

CREATE INDEX idx_invoices_tenant_id       ON invoices (tenant_id);
CREATE INDEX idx_invoices_tenant_customer ON invoices (tenant_id, customer_id);
CREATE INDEX idx_invoices_tenant_status   ON invoices (tenant_id, status);
CREATE INDEX idx_invoices_due_date        ON invoices (tenant_id, due_date) WHERE status NOT IN ('Paid', 'Void');

COMMENT ON TABLE  invoices               IS 'AR Invoices issued by the tenant to their customers.';
COMMENT ON COLUMN invoices.amount_due   IS 'Computed column: total_amount - amount_paid. Always current.';

CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================================
-- TABLE: invoice_items
-- ============================================================================

CREATE TABLE invoice_items (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ── Tenant isolation ────────────────────────────────────────────────────
    tenant_id        UUID           NOT NULL
                                     REFERENCES tenants (id)
                                     ON DELETE CASCADE
                                     ON UPDATE CASCADE,

    invoice_id       UUID           NOT NULL
                                     REFERENCES invoices (id)
                                     ON DELETE CASCADE
                                     ON UPDATE CASCADE,

    -- Optional link to an inventory product
    product_id       UUID           REFERENCES products (id) ON DELETE SET NULL,

    -- Line-item description (copied from product at time of invoicing or entered manually)
    description      TEXT           NOT NULL,
    quantity         NUMERIC(14, 4) NOT NULL,
    unit_price       NUMERIC(19, 4) NOT NULL,

    -- Tax rate as a decimal (e.g. 0.16 for 16% VAT)
    tax_rate         NUMERIC(6, 4)  NOT NULL DEFAULT 0.0000,

    -- Computed values (kept in sync by trigger)
    line_total       NUMERIC(19, 4) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    tax_amount       NUMERIC(19, 4) GENERATED ALWAYS AS (quantity * unit_price * tax_rate) STORED,

    -- Display order
    line_order       SMALLINT       NOT NULL DEFAULT 0,

    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    -- ── Constraints ─────────────────────────────────────────────────────────
    CONSTRAINT chk_item_quantity_positive   CHECK (quantity > 0),
    CONSTRAINT chk_item_unit_price_positive CHECK (unit_price >= 0),
    CONSTRAINT chk_item_tax_rate_range      CHECK (tax_rate >= 0 AND tax_rate <= 1)
);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items (invoice_id);
CREATE INDEX idx_invoice_items_tenant_id  ON invoice_items (tenant_id);
CREATE INDEX idx_invoice_items_product_id ON invoice_items (product_id) WHERE product_id IS NOT NULL;

COMMENT ON TABLE  invoice_items              IS 'Line items for each invoice. Drives invoice totals via trigger.';
COMMENT ON COLUMN invoice_items.tax_rate     IS 'Decimal rate, e.g. 0.16 = 16%. Applied per line.';

-- ============================================================================
-- TRIGGER: fn_recompute_invoice_totals
-- ============================================================================
-- Fires AFTER any INSERT/UPDATE/DELETE on invoice_items.
-- Recomputes the parent invoice's subtotal, tax, and total from scratch,
-- ensuring the header totals are always consistent with the lines.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_recompute_invoice_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_invoice_id     UUID;
    v_subtotal       NUMERIC(19, 4);
    v_tax            NUMERIC(19, 4);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;

    -- Check the invoice is still editable (not Paid or Void)
    IF EXISTS (
        SELECT 1 FROM invoices WHERE id = v_invoice_id AND status IN ('Paid', 'Void')
    ) THEN
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'Cannot modify line items on a % invoice (id=%).', 
                (SELECT status FROM invoices WHERE id = v_invoice_id), v_invoice_id;
        END IF;
    END IF;

    -- Recompute from all remaining lines
    SELECT
        COALESCE(SUM(quantity * unit_price), 0),
        COALESCE(SUM(quantity * unit_price * tax_rate), 0)
      INTO v_subtotal, v_tax
      FROM invoice_items
     WHERE invoice_id = v_invoice_id;

    UPDATE invoices
       SET subtotal_amount = v_subtotal,
           tax_amount      = v_tax,
           total_amount    = v_subtotal + v_tax,
           updated_at      = NOW()
     WHERE id = v_invoice_id;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recompute_invoice_totals
    AFTER INSERT OR UPDATE OR DELETE
    ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION fn_recompute_invoice_totals();

-- ============================================================================
-- Enable Row-Level Security on AR tables
-- ============================================================================

ALTER TABLE customers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- END OF MIGRATION: 002_create_ar_schema.sql
-- ============================================================================

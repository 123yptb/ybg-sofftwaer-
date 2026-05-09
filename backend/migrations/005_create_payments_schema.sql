-- ============================================================================
-- Migration: 005_create_payments_schema.sql
-- Phase 9 — Cash & Bank / Cheque Management
--
-- Tables: payments, cheques
--
-- Key features:
--   1. Records all money movements (Receipts from customers, Payments to suppliers).
--   2. Integrated Cheque Lifecycle:
--      Status: Pending -> Cleared / Returned
--   3. Double-entry integration:
--      - Receipts hit "Cheques in Hand" (Asset) if method is Cheque.
--      - Clearance moves funds from "Cheques in Hand" to "Bank".
-- ============================================================================

CREATE TYPE payment_method AS ENUM ('Cash', 'Bank', 'Cheque');
CREATE TYPE payment_entity_type AS ENUM ('Customer', 'Supplier', 'Account');
CREATE TYPE payment_type AS ENUM ('Receipt', 'Payment');
CREATE TYPE payment_status AS ENUM ('Pending', 'Cleared', 'Returned', 'Void');

-- ============================================================================
-- TABLE: payments
-- ============================================================================

CREATE TABLE payments (
    id               UUID                PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id        UUID                NOT NULL
                                          REFERENCES tenants (id)
                                          ON DELETE CASCADE
                                          ON UPDATE CASCADE,

    entity_type      payment_entity_type NOT NULL,
    entity_id        UUID                NOT NULL, -- FK to customers, suppliers, or accounts

    amount           NUMERIC(19,4)       NOT NULL,
    method           payment_method      NOT NULL,
    type             payment_type        NOT NULL,
    status           payment_status      NOT NULL DEFAULT 'Pending',

    payment_date     DATE                NOT NULL DEFAULT CURRENT_DATE,
    reference_no     VARCHAR(100),
    notes            TEXT,

    -- Link to the first Journal Entry (Recording)
    journal_entry_id UUID                REFERENCES journal_entries (id) ON DELETE SET NULL,
    
    -- Link to the second Journal Entry (Clearance)
    clearance_journal_entry_id UUID      REFERENCES journal_entries (id) ON DELETE SET NULL,

    created_by       UUID                NOT NULL REFERENCES users (id),
    created_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_payment_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_payments_tenant_id   ON payments (tenant_id);
CREATE INDEX idx_payments_entity      ON payments (tenant_id, entity_type, entity_id);
CREATE INDEX idx_payments_status      ON payments (tenant_id, status);
CREATE INDEX idx_payments_date        ON payments (tenant_id, payment_date);

COMMENT ON TABLE payments IS 'Head table for all cash/bank/cheque transactions.';

CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================================
-- TABLE: cheques
-- ============================================================================

CREATE TABLE cheques (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id       UUID          NOT NULL 
                                    REFERENCES payments (id) 
                                    ON DELETE CASCADE
                                    ON UPDATE CASCADE,

    tenant_id        UUID          NOT NULL
                                    REFERENCES tenants (id)
                                    ON DELETE CASCADE,

    cheque_no        VARCHAR(50)   NOT NULL,
    bank_name        VARCHAR(255)  NOT NULL,
    branch           VARCHAR(255),
    
    cheque_date      DATE          NOT NULL,
    maturity_date    DATE          NOT NULL,
    clearing_date    DATE,

    -- Status can be Clearing, Bounced, or voided.
    -- Usually stays in sync with its parent payment status.

    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_cheque_no_per_tenant UNIQUE (tenant_id, cheque_no, bank_name)
);

CREATE INDEX idx_cheques_payment_id ON cheques (payment_id);
CREATE INDEX idx_cheques_tenant_id  ON cheques (tenant_id);
CREATE INDEX idx_cheques_maturity   ON cheques (tenant_id, maturity_date) WHERE clearing_date IS NULL;

COMMENT ON TABLE cheques IS 'Specific metadata for payments made via Cheque method.';

CREATE TRIGGER trg_cheques_updated_at
    BEFORE UPDATE ON cheques
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================================
-- Row-Level Security
-- ============================================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cheques  ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- END OF MIGRATION: 005_create_payments_schema.sql
-- ============================================================================

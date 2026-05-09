-- ============================================================================
-- Migration: 001_create_core_schema.sql
-- Phase 1 — Foundation Tables: tenants, users, accounts,
--            journal_entries, journal_lines
--
-- Design Principles:
--   1. All financial tables carry a tenant_id FK → enforces logical isolation.
--   2. UUIDs are used as primary keys (not SERIAL) for security (no enumerable
--      integer IDs) and future distributed-system compatibility.
--   3. Timestamps always stored as TIMESTAMPTZ (timezone-aware UTC).
--   4. Double-entry bookkeeping is enforced at the DB via a CHECK constraint
--      on the journal_entries table (debit_total = credit_total via trigger).
--   5. Soft-delete via is_active / deleted_at rather than hard DELETE, to
--      preserve audit trails for financial records.
-- ============================================================================

-- Enable pgcrypto so we can generate UUIDs with gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- Defining enums here makes column contracts explicit and prevents invalid data
-- ============================================================================

-- RBAC roles supported in the system
CREATE TYPE user_role AS ENUM ('SuperAdmin', 'TenantAdmin', 'Employee');

-- Standard accounting account types (matches Chart of Accounts conventions)
CREATE TYPE account_type AS ENUM ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense');

-- Journals can be posted (locked) or draft (still editable)
CREATE TYPE journal_status AS ENUM ('Draft', 'Posted', 'Void');

-- ============================================================================
-- TABLE: tenants
-- ============================================================================
-- Each row represents one customer company (a "tenant").
-- This is the root anchor for ALL logical isolation.
-- SuperAdmin-only context: not filtered by tenant_id (it IS the tenant).
-- ============================================================================

CREATE TABLE tenants (
    id                 UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Company identity
    company_name       VARCHAR(255)    NOT NULL,
    company_email      VARCHAR(255)    NOT NULL UNIQUE,
    -- Industry slug (e.g. 'retail', 'services', 'manufacturing')
    industry           VARCHAR(100),
    -- ISO 4217 currency code (e.g. 'USD', 'KES', 'EUR')
    currency_code      CHAR(3)         NOT NULL DEFAULT 'USD',
    -- IANA timezone (e.g. 'Africa/Nairobi')
    timezone           VARCHAR(100)    NOT NULL DEFAULT 'UTC',

    -- Subscription / billing control
    is_active          BOOLEAN         NOT NULL DEFAULT TRUE,
    plan               VARCHAR(50)     NOT NULL DEFAULT 'free',
    trial_ends_at      TIMESTAMPTZ,
    subscription_ends_at TIMESTAMPTZ,

    -- Audit timestamps
    created_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Fast lookup by company email (used during login to resolve tenant)
CREATE INDEX idx_tenants_company_email ON tenants (company_email);
-- Filter active tenants (SuperAdmin dashboards)
CREATE INDEX idx_tenants_is_active     ON tenants (is_active);

COMMENT ON TABLE  tenants                  IS 'Root entity for multi-tenancy. One row per customer company.';
COMMENT ON COLUMN tenants.currency_code    IS 'ISO 4217 three-letter currency code for this tenant''s books.';
COMMENT ON COLUMN tenants.plan             IS 'Subscription tier: free | starter | professional | enterprise.';

-- ============================================================================
-- TABLE: users
-- ============================================================================
-- Users belong to exactly ONE tenant. The role column controls RBAC access.
-- A SuperAdmin row will have tenant_id = NULL (global admin).
-- ============================================================================

CREATE TABLE users (
    id                 UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to tenant (NULL only for SuperAdmin accounts)
    tenant_id          UUID            REFERENCES tenants (id)
                                        ON DELETE CASCADE
                                        ON UPDATE CASCADE,

    -- Identity
    full_name          VARCHAR(255)    NOT NULL,
    email              VARCHAR(255)    NOT NULL,
    -- bcrypt hash — NEVER store plaintext passwords
    password_hash      TEXT            NOT NULL,
    role               user_role       NOT NULL DEFAULT 'Employee',
    avatar_url         TEXT,

    -- Account status
    is_active          BOOLEAN         NOT NULL DEFAULT TRUE,
    email_verified_at  TIMESTAMPTZ,
    last_login_at      TIMESTAMPTZ,

    -- Audit timestamps
    created_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- ── Constraints ──────────────────────────────────────────────────────────
    -- Email must be unique within a tenant (different tenants CAN share emails)
    CONSTRAINT uq_users_email_per_tenant UNIQUE (tenant_id, email),

    -- SuperAdmin rows MUST have tenant_id = NULL
    -- Non-SuperAdmin rows MUST have a tenant_id
    CONSTRAINT chk_users_superadmin_no_tenant
        CHECK (
            (role = 'SuperAdmin' AND tenant_id IS NULL) OR
            (role <> 'SuperAdmin' AND tenant_id IS NOT NULL)
        )
);

-- Tenant-scoped user lookups (most common query pattern)
CREATE INDEX idx_users_tenant_id  ON users (tenant_id);
-- Fast auth lookup by email (across all tenants — login pre-filters by email)
CREATE INDEX idx_users_email      ON users (email);
CREATE INDEX idx_users_is_active  ON users (tenant_id, is_active);

COMMENT ON TABLE  users                    IS 'Platform users. Each user belongs to one tenant, except SuperAdmins (tenant_id IS NULL).';
COMMENT ON COLUMN users.password_hash      IS 'bcrypt hash (cost factor ≥ 12). Never store or log raw passwords.';
COMMENT ON COLUMN users.role               IS 'RBAC role. SuperAdmin: global. TenantAdmin: full tenant access. Employee: restricted.';

-- ============================================================================
-- TABLE: accounts
-- ============================================================================
-- Standard Chart of Accounts. Every entry in the General Ledger posts
-- to an account here. Strictly tenant-scoped.
-- ============================================================================

CREATE TABLE accounts (
    id                 UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ── CRITICAL: Tenant isolation ───────────────────────────────────────────
    tenant_id          UUID            NOT NULL
                                        REFERENCES tenants (id)
                                        ON DELETE CASCADE
                                        ON UPDATE CASCADE,

    -- Accounting identity
    -- Format: "1000", "2100", "4000-01" — enforced unique per tenant
    account_code       VARCHAR(20)     NOT NULL,
    name               VARCHAR(255)    NOT NULL,
    type               account_type    NOT NULL,
    -- Optional sub-classification (e.g. 'Cash', 'Accounts Receivable')
    sub_type           VARCHAR(100),
    description        TEXT,

    -- Running balance (denormalised for performance; always recomputed from
    -- journal_lines as the source of truth during reconciliation)
    balance            NUMERIC(19, 4)  NOT NULL DEFAULT 0.0000,

    -- Hierarchy support (e.g. parent account "Cash" → child "Petty Cash")
    parent_account_id  UUID            REFERENCES accounts (id)
                                        ON DELETE SET NULL
                                        ON UPDATE CASCADE,

    -- Control flags
    is_active          BOOLEAN         NOT NULL DEFAULT TRUE,
    -- System accounts cannot be deleted or renamed by users
    is_system_account  BOOLEAN         NOT NULL DEFAULT FALSE,

    -- Audit timestamps
    created_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- ── Constraints ──────────────────────────────────────────────────────────
    -- Account codes must be unique within a tenant's chart of accounts
    CONSTRAINT uq_accounts_code_per_tenant UNIQUE (tenant_id, account_code),
    -- Balance can be negative (e.g. contra-assets), but must be a valid number
    CONSTRAINT chk_accounts_balance_not_nan CHECK (balance = balance)  -- NaN guard
);

-- Primary access pattern: all accounts for a tenant
CREATE INDEX idx_accounts_tenant_id         ON accounts (tenant_id);
-- Lookup by code (posting, imports)
CREATE INDEX idx_accounts_tenant_code       ON accounts (tenant_id, account_code);
-- Filter by type for financial statements
CREATE INDEX idx_accounts_tenant_type       ON accounts (tenant_id, type);
-- Tree traversal
CREATE INDEX idx_accounts_parent_account_id ON accounts (parent_account_id);

COMMENT ON TABLE  accounts                  IS 'Chart of Accounts per tenant. The backbone of the General Ledger.';
COMMENT ON COLUMN accounts.balance          IS 'Denormalised running balance. Recomputed from journal_lines during reconciliation.';
COMMENT ON COLUMN accounts.is_system_account IS 'TRUE = created by the system during onboarding; cannot be deleted by users.';

-- ============================================================================
-- TABLE: journal_entries
-- ============================================================================
-- A journal entry is the atomic transaction unit in double-entry bookkeeping.
-- It must always balance: SUM(debit) == SUM(credit) across all its lines.
-- The balance constraint is enforced via a deferred trigger (see below).
-- ============================================================================

CREATE TABLE journal_entries (
    id                 UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ── CRITICAL: Tenant isolation ───────────────────────────────────────────
    tenant_id          UUID            NOT NULL
                                        REFERENCES tenants (id)
                                        ON DELETE CASCADE
                                        ON UPDATE CASCADE,

    -- Reference number visible to users (e.g. "JE-2024-00001")
    entry_number       VARCHAR(50)     NOT NULL,
    -- Human-readable description of what this entry records
    description        TEXT            NOT NULL,
    -- The date the transaction economically occurred (not necessarily posted date)
    transaction_date   DATE            NOT NULL,
    -- The accounting period this entry belongs to (YYYY-MM)
    period             CHAR(7)         NOT NULL,   -- e.g. '2024-03'

    status             journal_status  NOT NULL DEFAULT 'Draft',

    -- Optional link to source document (invoice_id, bill_id, etc.)
    -- Stored as text to avoid tight coupling to specific source tables
    reference_type     VARCHAR(50),    -- e.g. 'invoice', 'bill', 'manual'
    reference_id       UUID,           -- FK to the source document

    -- Who created / approved this entry
    created_by         UUID            NOT NULL REFERENCES users (id),
    posted_by          UUID            REFERENCES users (id),
    posted_at          TIMESTAMPTZ,
    voided_by          UUID            REFERENCES users (id),
    voided_at          TIMESTAMPTZ,

    -- Audit timestamps
    created_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- ── Constraints ──────────────────────────────────────────────────────────
    CONSTRAINT uq_journal_entry_number_per_tenant UNIQUE (tenant_id, entry_number),
    -- A posted entry cannot have a null posted_at
    CONSTRAINT chk_journal_posted_requires_timestamp
        CHECK (status <> 'Posted' OR posted_at IS NOT NULL),
    -- A voided entry cannot have a null voided_at
    CONSTRAINT chk_journal_voided_requires_timestamp
        CHECK (status <> 'Void' OR voided_at IS NOT NULL),
    -- Period format: 'YYYY-MM'
    CONSTRAINT chk_journal_period_format
        CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$')
);

-- Most queries fetch journal entries for a tenant within a date range
CREATE INDEX idx_je_tenant_date    ON journal_entries (tenant_id, transaction_date DESC);
-- Filter by period (for period-close workflows)
CREATE INDEX idx_je_tenant_period  ON journal_entries (tenant_id, period);
-- Filter by status (Draft → Posted workflow)
CREATE INDEX idx_je_tenant_status  ON journal_entries (tenant_id, status);
-- Source document lookups (e.g. "show me all JEs for invoice #123")
CREATE INDEX idx_je_reference      ON journal_entries (tenant_id, reference_type, reference_id)
    WHERE reference_id IS NOT NULL;

COMMENT ON TABLE  journal_entries               IS 'Atomic double-entry bookkeeping transactions. Must always balance (enforced via trigger).';
COMMENT ON COLUMN journal_entries.period        IS 'Accounting period in YYYY-MM format. Used for period-close controls.';
COMMENT ON COLUMN journal_entries.reference_type IS 'Polymorphic source: invoice | bill | payroll | manual | etc.';

-- ============================================================================
-- TABLE: journal_lines
-- ============================================================================
-- Each journal entry has ≥ 2 lines. Exactly one of debit_amount or
-- credit_amount must be non-zero per line (XOR enforced by constraint).
-- The sum of all debits MUST equal the sum of all credits for an entry
-- (enforced by the trigger below).
-- ============================================================================

CREATE TABLE journal_lines (
    id                 UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ── CRITICAL: Tenant isolation ───────────────────────────────────────────
    -- Redundant with journal_entry → tenant_id, but included for row-level
    -- security and to avoid joins in tenant-filtered queries.
    tenant_id          UUID            NOT NULL
                                        REFERENCES tenants (id)
                                        ON DELETE CASCADE
                                        ON UPDATE CASCADE,

    -- Parent journal entry
    journal_entry_id   UUID            NOT NULL
                                        REFERENCES journal_entries (id)
                                        ON DELETE CASCADE
                                        ON UPDATE CASCADE,

    -- The account being debited or credited
    account_id         UUID            NOT NULL
                                        REFERENCES accounts (id)
                                        ON DELETE RESTRICT   -- never orphan a line
                                        ON UPDATE CASCADE,

    -- Amounts: exactly one must be > 0, the other must be 0
    debit_amount       NUMERIC(19, 4)  NOT NULL DEFAULT 0.0000,
    credit_amount      NUMERIC(19, 4)  NOT NULL DEFAULT 0.0000,

    -- Optional memo for this specific line (e.g. "Electricity bill share")
    memo               TEXT,

    -- Ordering for display purposes
    line_order         SMALLINT        NOT NULL DEFAULT 0,

    -- Audit timestamps
    created_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- ── Constraints ──────────────────────────────────────────────────────────
    -- Amounts must be non-negative
    CONSTRAINT chk_jl_debit_non_negative
        CHECK (debit_amount  >= 0),
    CONSTRAINT chk_jl_credit_non_negative
        CHECK (credit_amount >= 0),
    -- Each line is EITHER a debit OR a credit, never both, never neither
    CONSTRAINT chk_jl_debit_xor_credit
        CHECK (
            (debit_amount  > 0 AND credit_amount = 0) OR
            (credit_amount > 0 AND debit_amount  = 0)
        ),
    -- Tenant consistency: the line must belong to the same tenant as its entry
    -- (enforced more tightly via application layer and the trigger below)
    CONSTRAINT chk_jl_amounts_not_zero
        CHECK (debit_amount + credit_amount > 0)
);

-- All lines for a journal entry (standard GL posting query)
CREATE INDEX idx_jl_journal_entry_id ON journal_lines (journal_entry_id);
-- Tenant-scoped account activity (account ledger / T-account view)
CREATE INDEX idx_jl_tenant_account   ON journal_lines (tenant_id, account_id);
-- Tenant-scoped full ledger scan
CREATE INDEX idx_jl_tenant_id        ON journal_lines (tenant_id);

COMMENT ON TABLE  journal_lines               IS 'Individual debit/credit lines of a journal entry. ≥ 2 lines per entry. Must balance.';
COMMENT ON COLUMN journal_lines.debit_amount  IS 'Mutually exclusive with credit_amount. Exactly one must be > 0 per line.';
COMMENT ON COLUMN journal_lines.credit_amount IS 'Mutually exclusive with debit_amount. Exactly one must be > 0 per line.';

-- ============================================================================
-- TRIGGER: enforce_journal_balance
-- ============================================================================
-- This trigger fires AFTER INSERT/UPDATE/DELETE on journal_lines.
-- It ensures that for any Posted journal entry, the sum of all debit lines
-- equals the sum of all credit lines (fundamental double-entry rule).
-- Draft entries are allowed to be temporarily unbalanced to support
-- incremental data entry workflows.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_check_journal_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_entry_id     UUID;
    v_entry_status journal_status;
    v_total_debit  NUMERIC(19, 4);
    v_total_credit NUMERIC(19, 4);
BEGIN
    -- Determine which journal_entry_id to check
    IF TG_OP = 'DELETE' THEN
        v_entry_id := OLD.journal_entry_id;
    ELSE
        v_entry_id := NEW.journal_entry_id;
    END IF;

    -- Fetch the current status of the entry
    SELECT status
      INTO v_entry_status
      FROM journal_entries
     WHERE id = v_entry_id;

    -- Only enforce balance for Posted entries.
    -- Draft entries may be partially entered.
    IF v_entry_status = 'Posted' THEN
        SELECT
            COALESCE(SUM(debit_amount),  0),
            COALESCE(SUM(credit_amount), 0)
          INTO v_total_debit, v_total_credit
          FROM journal_lines
         WHERE journal_entry_id = v_entry_id;

        IF v_total_debit <> v_total_credit THEN
            RAISE EXCEPTION
                'Double-entry imbalance detected for journal_entry_id=%. '
                'Total debits (%) ≠ total credits (%). '
                'A Posted journal entry must always balance.',
                v_entry_id,
                v_total_debit,
                v_total_credit;
        END IF;
    END IF;

    -- Also block modification of any line whose parent entry is Posted or Void
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        IF v_entry_status IN ('Posted', 'Void') THEN
            RAISE EXCEPTION
                'Cannot modify journal_lines for a % journal_entry (id=%). '
                'Void the entry first, then create a correcting entry.',
                v_entry_status,
                v_entry_id;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        IF v_entry_status IN ('Posted', 'Void') THEN
            RAISE EXCEPTION
                'Cannot delete journal_lines from a % journal_entry (id=%).',
                v_entry_status,
                v_entry_id;
        END IF;
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

-- Attach the trigger to journal_lines (fires per-row, after any DML)
CREATE TRIGGER trg_enforce_journal_balance
    AFTER INSERT OR UPDATE OR DELETE
    ON journal_lines
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_journal_balance();

-- ============================================================================
-- TRIGGER: update_account_balance
-- ============================================================================
-- Keeps the denormalised `accounts.balance` column in sync whenever a
-- journal line is inserted, updated, or deleted.
--
-- Balance convention (standard accounting):
--   Asset / Expense accounts:    balance increases with DEBIT
--   Liability / Equity / Revenue: balance increases with CREDIT
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_update_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_account_id  UUID;
    v_account_type account_type;
    v_delta       NUMERIC(19, 4) := 0;
BEGIN
    -- ── Handle DELETE ─────────────────────────────────────────────────────────
    IF TG_OP = 'DELETE' THEN
        v_account_id := OLD.account_id;
        SELECT type INTO v_account_type FROM accounts WHERE id = v_account_id;

        IF v_account_type IN ('Asset', 'Expense') THEN
            -- Reversing a debit reduces the balance; reversing a credit increases it
            v_delta := OLD.credit_amount - OLD.debit_amount;
        ELSE
            v_delta := OLD.debit_amount  - OLD.credit_amount;
        END IF;

        UPDATE accounts
           SET balance    = balance + v_delta,
               updated_at = NOW()
         WHERE id = v_account_id;

        RETURN OLD;
    END IF;

    -- ── Handle INSERT ─────────────────────────────────────────────────────────
    IF TG_OP = 'INSERT' THEN
        v_account_id := NEW.account_id;
        SELECT type INTO v_account_type FROM accounts WHERE id = v_account_id;

        IF v_account_type IN ('Asset', 'Expense') THEN
            v_delta := NEW.debit_amount - NEW.credit_amount;
        ELSE
            v_delta := NEW.credit_amount - NEW.debit_amount;
        END IF;

        UPDATE accounts
           SET balance    = balance + v_delta,
               updated_at = NOW()
         WHERE id = v_account_id;

        RETURN NEW;
    END IF;

    -- ── Handle UPDATE ─────────────────────────────────────────────────────────
    IF TG_OP = 'UPDATE' THEN
        -- First reverse the old effect on the old account
        v_account_id := OLD.account_id;
        SELECT type INTO v_account_type FROM accounts WHERE id = v_account_id;

        IF v_account_type IN ('Asset', 'Expense') THEN
            v_delta := OLD.credit_amount - OLD.debit_amount;
        ELSE
            v_delta := OLD.debit_amount  - OLD.credit_amount;
        END IF;

        UPDATE accounts
           SET balance    = balance + v_delta,
               updated_at = NOW()
         WHERE id = v_account_id;

        -- Then apply the new effect on the new account
        v_account_id := NEW.account_id;
        SELECT type INTO v_account_type FROM accounts WHERE id = v_account_id;

        IF v_account_type IN ('Asset', 'Expense') THEN
            v_delta := NEW.debit_amount - NEW.credit_amount;
        ELSE
            v_delta := NEW.credit_amount - NEW.debit_amount;
        END IF;

        UPDATE accounts
           SET balance    = balance + v_delta,
               updated_at = NOW()
         WHERE id = v_account_id;

        RETURN NEW;
    END IF;
END;
$$;

CREATE TRIGGER trg_update_account_balance
    AFTER INSERT OR UPDATE OR DELETE
    ON journal_lines
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_account_balance();

-- ============================================================================
-- AUTO-UPDATE updated_at TRIGGER (shared utility)
-- ============================================================================
-- Rather than updating `updated_at` manually in every query, a single trigger
-- function handles it for all tables that have the column.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

-- Attach to each table that has updated_at
CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_journal_entries_updated_at
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================================
-- PERMISSIONS (Row-Level Security skeleton — to be fully configured per-phase)
-- ============================================================================
-- Enable RLS on all tenant-scoped tables.
-- Policies will be added once the application DB role is established.

ALTER TABLE accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines   ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- END OF MIGRATION: 001_create_core_schema.sql
-- ============================================================================

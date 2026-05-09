-- ============================================================================
-- Migration: 006_create_support_schema.sql
-- Phase 5 — System Support & Multi-Tenancy Module Management
--
-- Tables: support_tickets
-- Alterations: Add active_modules to tenants
-- ============================================================================

-- ============================================================================
-- ALTERATION: tenants table
-- ============================================================================
-- Add a JSONB column to track module management permissions per tenant
-- Supported modules: 'core', 'ar', 'inventory', 'ap', 'support'
ALTER TABLE tenants 
ADD COLUMN active_modules JSONB NOT NULL DEFAULT '["core", "ar", "inventory", "ap", "support"]'::jsonb;

COMMENT ON COLUMN tenants.active_modules IS 'JSON array of string module identifiers enabled for this tenant.';

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE ticket_status AS ENUM ('Open', 'In Progress', 'Resolved', 'Closed');
CREATE TYPE ticket_priority AS ENUM ('Low', 'Medium', 'High', 'Urgent');

-- ============================================================================
-- TABLE: support_tickets
-- ============================================================================

CREATE TABLE support_tickets (
    id                 UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ── Tenant isolation ────────────────────────────────────────────────────
    tenant_id          UUID            NOT NULL
                                        REFERENCES tenants (id)
                                        ON DELETE CASCADE
                                        ON UPDATE CASCADE,

    -- Identity
    created_by         UUID            NOT NULL 
                                        REFERENCES users (id)
                                        ON DELETE RESTRICT,
    
    subject            VARCHAR(255)    NOT NULL,
    description        TEXT            NOT NULL,

    status             ticket_status   NOT NULL DEFAULT 'Open',
    priority           ticket_priority NOT NULL DEFAULT 'Medium',

    -- Optional link to a specific module the issue is about
    module_reference   VARCHAR(100),

    -- Audit timestamps
    created_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Fast lookup for tenant-scoped ticket lists
CREATE INDEX idx_support_tickets_tenant_id  ON support_tickets (tenant_id);
-- Fast lookup for filtering by status
CREATE INDEX idx_support_tickets_status     ON support_tickets (tenant_id, status);

COMMENT ON TABLE  support_tickets               IS 'Support tickets filed by tenant users for the SuperAdmin (YBG Team) to resolve.';
COMMENT ON COLUMN support_tickets.description    IS 'Full text description of the issue or request.';

-- Auto-update updated_at trigger
CREATE TRIGGER trg_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================================
-- PERMISSIONS (Row-Level Security)
-- ============================================================================
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- END OF MIGRATION: 006_create_support_schema.sql
-- ============================================================================

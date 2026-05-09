/**
 * @file seed_chart_of_accounts.sql
 * @description Default Chart of Accounts seeded for every new tenant.
 *
 * This is a TEMPLATE seed — the actual seeding is done dynamically by the
 * onboarding service in Node.js (substituting the real tenant_id UUID),
 * NOT run directly from this file.
 *
 * Account Code Conventions:
 *   1000–1999 → Assets
 *   2000–2999 → Liabilities
 *   3000–3999 → Equity
 *   4000–4999 → Revenue
 *   5000–5999 → Expenses
 */

-- This file is illustrative. See: src/services/onboarding.service.js
-- which calls insertDefaultChartOfAccounts(tenantId, client)

SELECT 'Chart of Accounts seed is applied dynamically by the onboarding service.' AS info;

/**
 * @file support.model.js
 * @description Data-access layer for the support_tickets table.
 */

const pool = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * Create a new support ticket for a tenant
 */
const createTicket = async (tenantId, userId, payload) => {
  const query = `
    INSERT INTO support_tickets (tenant_id, created_by, subject, description, priority, module_reference)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    tenantId,
    userId,
    payload.subject,
    payload.description,
    payload.priority || 'Medium',
    payload.moduleReference || null,
  ]);
  return rows[0];
};

/**
 * List all tickets for a specific tenant (for standard users)
 */
const getTicketsByTenant = async (tenantId, { status } = {}) => {
  let query = `
    SELECT st.*, u.full_name as creator_name 
    FROM support_tickets st
    JOIN users u ON st.created_by = u.id
    WHERE st.tenant_id = $1
  `;
  const values = [tenantId];
  let idx = 2;

  if (status) {
    query += ` AND st.status = $${idx}`;
    values.push(status);
    idx++;
  }
  query += ` ORDER BY st.created_at DESC`;

  const { rows } = await pool.query(query, values);
  return rows;
};

/**
 * SuperAdmin: List ALL tickets across ALL tenants
 */
const getAllTicketsGlobal = async ({ status, tenantId } = {}) => {
  let query = `
    SELECT st.*, u.full_name as creator_name, t.company_name
    FROM support_tickets st
    JOIN users u ON st.created_by = u.id
    JOIN tenants t ON st.tenant_id = t.id
    WHERE 1=1
  `;
  const values = [];
  let idx = 1;

  if (status) {
    query += ` AND st.status = $${idx}`;
    values.push(status);
    idx++;
  }
  if (tenantId) {
    query += ` AND st.tenant_id = $${idx}`;
    values.push(tenantId);
    idx++;
  }
  query += ` ORDER BY st.created_at DESC`;

  const { rows } = await pool.query(query, values);
  return rows;
};

/**
 * Update support ticket status / priority (SuperAdmin)
 */
const updateTicket = async (ticketId, payload) => {
  const query = `
    UPDATE support_tickets SET
      status = COALESCE($1, status),
      priority = COALESCE($2, priority),
      updated_at = NOW()
    WHERE id = $3
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    payload.status || null,
    payload.priority || null,
    ticketId,
  ]);
  if (!rows.length) throw new ApiError(404, 'Ticket not found');
  return rows[0];
};

/**
 * SuperAdmin: Update active_modules for a tenant
 */
const toggleTenantModules = async (tenantId, modules) => {
  const query = `
    UPDATE tenants SET
      active_modules = $1::jsonb,
      updated_at = NOW()
    WHERE id = $2
    RETURNING id, company_name, active_modules;
  `;
  const { rows } = await pool.query(query, [
    JSON.stringify(modules),
    tenantId,
  ]);
  if (!rows.length) throw new ApiError(404, 'Tenant not found');
  return rows[0];
};

module.exports = {
  createTicket,
  getTicketsByTenant,
  getAllTicketsGlobal,
  updateTicket,
  toggleTenantModules,
};

const pool = require('../config/database');

const createUser = async ({ tenantId, fullName, email, passwordHash, role }, client = pool) => {
  const query = `
    INSERT INTO users (tenant_id, full_name, email, password_hash, role)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, tenant_id, full_name, email, role, is_active, created_at;
  `;
  const values = [tenantId, fullName, email, passwordHash, role];
  const { rows } = await client.query(query, values);
  return rows[0];
};

const getUserByEmail = async (email, client = pool) => {
  // We need password_hash to verify login, but we'll strip it at the service layer
  const query = `SELECT * FROM users WHERE email = $1 AND is_active = true`;
  const { rows } = await client.query(query, [email]);
  return rows[0];
};

const getUserById = async (id, client = pool) => {
  const query = `SELECT id, tenant_id, full_name, email, role, is_active, created_at FROM users WHERE id = $1`;
  const { rows } = await client.query(query, [id]);
  return rows[0];
};

module.exports = { createUser, getUserByEmail, getUserById };

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RegisterCompany from './pages/RegisterCompany';
import Dashboard from './pages/Dashboard';

// Placeholder pages — full modules will be added next
const Login = () => (
  <div style={{
    display: 'flex', height: '100vh', alignItems: 'center',
    justifyContent: 'center', flexDirection: 'column', gap: '1.5rem',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🛡️</div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginBottom: '0.25rem' }}>
        Pro Accounting &amp; ERP
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Professional Double-Entry Accounting System</p>
    </div>

    <div style={{
      background: '#1e293b', borderRadius: '16px', padding: '2rem',
      border: '1px solid #334155', width: '100%', maxWidth: '380px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.3)'
    }}>
      <h2 style={{ color: '#f1f5f9', marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 600 }}>
        Sign In
      </h2>
      <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>
            Email Address or Staff ID
          </label>
          <input
            id="login-email"
            type="text"
            placeholder="admin@company.com or username"
            style={{
              width: '100%', padding: '0.75rem 1rem', background: '#0f172a',
              border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9',
              fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>
        <div>
          <label style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>
            Password
          </label>
          <input
            id="login-password"
            type="password"
            placeholder="••••••••"
            style={{
              width: '100%', padding: '0.75rem 1rem', background: '#0f172a',
              border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9',
              fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>
        <button
          id="login-submit"
          type="submit"
          style={{
            padding: '0.8rem', background: '#10b981', border: 'none',
            borderRadius: '8px', color: '#fff', fontWeight: 600,
            fontSize: '1rem', marginTop: '0.5rem', cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#059669'}
          onMouseOut={(e) => e.currentTarget.style.background = '#10b981'}
        >
          Sign In
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center', marginTop: '1.5rem' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
          New business?{' '}
          <a href="/register" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
            Register Company
          </a>
        </p>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
          Joining a team?{' '}
          <a href="/staff-signup" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
            Staff Sign Up
          </a>
        </p>
      </div>

      <p style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center', marginTop: '1rem' }}>
        Pro Accounting &amp; ERP v2.0 — Offline &amp; Cloud Ready
      </p>
    </div>
  </div>
);

// Dashboard is now a full page component imported from pages/Dashboard.jsx

// Bug fix: Simple AuthGuard — checks if a session exists in localStorage
const AuthGuard = ({ children }) => {
  const session = localStorage.getItem('pro_erp_session');
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<RegisterCompany />} />
      <Route path="/staff-signup" element={<Navigate to="/login" replace />} />
      <Route
        path="/"
        element={
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        }
      />
      {/* Bug fix: wildcard catches all unknown routes → redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;

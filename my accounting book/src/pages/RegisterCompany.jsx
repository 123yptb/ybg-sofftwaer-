import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const INDUSTRIES = [
  'Retail & Commerce',
  'Manufacturing',
  'Technology & IT',
  'Healthcare',
  'Construction & Real Estate',
  'Food & Beverage',
  'Education',
  'Transportation & Logistics',
  'Financial Services',
  'Agriculture',
  'Other',
];

const inputStyle = {
  width: '100%',
  padding: '0.75rem 1rem',
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#f1f5f9',
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const labelStyle = {
  color: '#94a3b8',
  fontSize: '0.85rem',
  display: 'block',
  marginBottom: '0.4rem',
  fontWeight: 500,
};

const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

const Row = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
    {children}
  </div>
);

export default function RegisterCompany() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = Company Info, 2 = Admin Account
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    // Company
    companyName: '',
    industry: '',
    phone: '',
    email: '',
    address: '',
    currency: 'USD',
    taxId: '',
    // Admin
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminConfirm: '',
  });

  const set = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const validateStep1 = () => {
    if (!form.companyName.trim()) return 'Company name is required.';
    if (!form.industry) return 'Please select an industry.';
    if (!form.email.trim() || !form.email.includes('@'))
      return 'A valid company email is required.';
    return null;
  };

  const validateStep2 = () => {
    if (!form.adminName.trim()) return 'Admin full name is required.';
    if (!form.adminEmail.trim() || !form.adminEmail.includes('@'))
      return 'A valid admin email is required.';
    if (form.adminPassword.length < 6)
      return 'Password must be at least 6 characters.';
    if (form.adminPassword !== form.adminConfirm)
      return 'Passwords do not match.';
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep(2);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const err = validateStep2();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);

    // Simulate async registration (replace with real Supabase / API call)
    await new Promise((r) => setTimeout(r, 1000));

    const company = {
      id: crypto.randomUUID(),
      name: form.companyName,
      industry: form.industry,
      phone: form.phone,
      email: form.email,
      address: form.address,
      currency: form.currency,
      taxId: form.taxId,
      createdAt: new Date().toISOString(),
    };

    const session = {
      userId: crypto.randomUUID(),
      name: form.adminName,
      email: form.adminEmail,
      role: 'admin',
      company,
      token: btoa(`${form.adminEmail}:${Date.now()}`),
    };

    localStorage.setItem('pro_erp_session', JSON.stringify(session));
    localStorage.setItem('pro_erp_company', JSON.stringify(company));

    setLoading(false);
    navigate('/');
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1.5rem',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        padding: '2rem 1rem',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏢</div>
        <h1
          style={{
            fontSize: '1.8rem',
            fontWeight: 800,
            color: '#10b981',
            marginBottom: '0.25rem',
          }}
        >
          Register Company
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          Set up your Pro Accounting &amp; ERP workspace
        </p>
      </div>

      {/* Step Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {[1, 2].map((s) => (
          <React.Fragment key={s}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
                background: step >= s ? '#10b981' : '#334155',
                color: step >= s ? '#fff' : '#64748b',
                transition: 'background 0.3s',
              }}
            >
              {s}
            </div>
            {s < 2 && (
              <div
                style={{
                  width: 48,
                  height: 2,
                  background: step > s ? '#10b981' : '#334155',
                  transition: 'background 0.3s',
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '-0.75rem' }}>
        Step {step} of 2 — {step === 1 ? 'Company Details' : 'Admin Account'}
      </p>

      {/* Card */}
      <div
        style={{
          background: '#1e293b',
          borderRadius: '16px',
          padding: '2rem',
          border: '1px solid #334155',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}
      >
        {error && (
          <div
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              color: '#f87171',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* ── Step 1: Company Info ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ color: '#f1f5f9', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              🏢 Company Information
            </h2>

            <Field label="Company Name *">
              <input id="reg-company-name" style={inputStyle} value={form.companyName}
                onChange={set('companyName')} placeholder="Elachi Enterprises Ltd."
                onFocus={e => e.target.style.borderColor = '#10b981'}
                onBlur={e => e.target.style.borderColor = '#334155'}
              />
            </Field>

            <Field label="Industry *">
              <select id="reg-industry" style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.industry} onChange={set('industry')}
                onFocus={e => e.target.style.borderColor = '#10b981'}
                onBlur={e => e.target.style.borderColor = '#334155'}
              >
                <option value="">Select industry…</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </Field>

            <Row>
              <Field label="Company Email *">
                <input id="reg-company-email" style={inputStyle} type="email"
                  value={form.email} onChange={set('email')} placeholder="info@company.com"
                  onFocus={e => e.target.style.borderColor = '#10b981'}
                  onBlur={e => e.target.style.borderColor = '#334155'}
                />
              </Field>
              <Field label="Phone">
                <input id="reg-company-phone" style={inputStyle} type="tel"
                  value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000"
                  onFocus={e => e.target.style.borderColor = '#10b981'}
                  onBlur={e => e.target.style.borderColor = '#334155'}
                />
              </Field>
            </Row>

            <Field label="Business Address">
              <input id="reg-address" style={inputStyle} value={form.address}
                onChange={set('address')} placeholder="123 Main St, City, Country"
                onFocus={e => e.target.style.borderColor = '#10b981'}
                onBlur={e => e.target.style.borderColor = '#334155'}
              />
            </Field>

            <Row>
              <Field label="Default Currency">
                <select id="reg-currency" style={{ ...inputStyle, cursor: 'pointer' }}
                  value={form.currency} onChange={set('currency')}
                  onFocus={e => e.target.style.borderColor = '#10b981'}
                  onBlur={e => e.target.style.borderColor = '#334155'}
                >
                  {['USD','EUR','GBP','KES','NGN','ZAR','INR','AED','GHS','TZS'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Tax / VAT ID">
                <input id="reg-tax-id" style={inputStyle} value={form.taxId}
                  onChange={set('taxId')} placeholder="Optional"
                  onFocus={e => e.target.style.borderColor = '#10b981'}
                  onBlur={e => e.target.style.borderColor = '#334155'}
                />
              </Field>
            </Row>

            <button id="reg-next-btn" onClick={handleNext}
              style={{
                padding: '0.85rem', background: '#10b981', border: 'none',
                borderRadius: '8px', color: '#fff', fontWeight: 700,
                fontSize: '1rem', cursor: 'pointer', transition: 'background 0.2s',
                marginTop: '0.5rem',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#059669'}
              onMouseOut={e => e.currentTarget.style.background = '#10b981'}
            >
              Next: Admin Account →
            </button>
          </div>
        )}

        {/* ── Step 2: Admin Account ── */}
        {step === 2 && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ color: '#f1f5f9', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              👤 Admin Account
            </h2>

            <Field label="Full Name *">
              <input id="reg-admin-name" style={inputStyle} value={form.adminName}
                onChange={set('adminName')} placeholder="John Doe"
                onFocus={e => e.target.style.borderColor = '#10b981'}
                onBlur={e => e.target.style.borderColor = '#334155'}
              />
            </Field>

            <Field label="Admin Email *">
              <input id="reg-admin-email" style={inputStyle} type="email"
                value={form.adminEmail} onChange={set('adminEmail')}
                placeholder="admin@company.com"
                onFocus={e => e.target.style.borderColor = '#10b981'}
                onBlur={e => e.target.style.borderColor = '#334155'}
              />
            </Field>

            <Field label="Password * (min 6 chars)">
              <input id="reg-password" style={inputStyle} type="password"
                value={form.adminPassword} onChange={set('adminPassword')}
                placeholder="••••••••"
                onFocus={e => e.target.style.borderColor = '#10b981'}
                onBlur={e => e.target.style.borderColor = '#334155'}
              />
            </Field>

            <Field label="Confirm Password *">
              <input id="reg-confirm" style={inputStyle} type="password"
                value={form.adminConfirm} onChange={set('adminConfirm')}
                placeholder="••••••••"
                onFocus={e => e.target.style.borderColor = '#10b981'}
                onBlur={e => e.target.style.borderColor = '#334155'}
              />
            </Field>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => { setStep(1); setError(''); }}
                style={{
                  flex: 1, padding: '0.85rem', background: 'transparent',
                  border: '1px solid #334155', borderRadius: '8px', color: '#94a3b8',
                  fontWeight: 600, fontSize: '1rem', cursor: 'pointer',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#64748b'; e.currentTarget.style.color = '#f1f5f9'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                ← Back
              </button>
              <button id="reg-submit-btn" type="submit" disabled={loading}
                style={{
                  flex: 2, padding: '0.85rem',
                  background: loading ? '#059669' : '#10b981',
                  border: 'none', borderRadius: '8px', color: '#fff',
                  fontWeight: 700, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}
                onMouseOver={e => { if (!loading) e.currentTarget.style.background = '#059669'; }}
                onMouseOut={e => { if (!loading) e.currentTarget.style.background = '#10b981'; }}
              >
                {loading ? (
                  <>
                    <span style={{
                      width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid #fff', borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite', display: 'inline-block',
                    }} />
                    Registering…
                  </>
                ) : '🚀 Create Company'}
              </button>
            </div>
          </form>
        )}
      </div>

      <p style={{ color: '#64748b', fontSize: '0.82rem' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: '#3b82f6', fontWeight: 600 }}>
          Sign In
        </Link>
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { background: #1e293b; color: #f1f5f9; }
      `}</style>
    </div>
  );
}

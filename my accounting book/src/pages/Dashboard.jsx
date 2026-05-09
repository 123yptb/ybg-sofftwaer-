import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Mock data (replace with real API calls when backend is live) ───────────────
const MOCK_STATS = {
  revenue:      { value: 284500, change: +12.4, label: 'Total Revenue',      icon: '💰', color: '#10b981' },
  invoices:     { value: 47,     change: +3,    label: 'Total Invoices',     icon: '📄', color: '#3b82f6' },
  outstanding:  { value: 38200,  change: -5.1,  label: 'Outstanding (AR)',   icon: '⏳', color: '#f59e0b' },
  customers:    { value: 31,     change: +2,    label: 'Active Customers',   icon: '👥', color: '#8b5cf6' },
  paid:         { value: 29,     change: +4,    label: 'Paid Invoices',      icon: '✅', color: '#06b6d4' },
  expenses:     { value: 52300,  change: +1.8,  label: 'Total Expenses',     icon: '📤', color: '#ef4444' },
};

const MOCK_RECENT_INVOICES = [
  { id: 'INV-0047', customer: 'Elachi Supplies Ltd', amount: 12500, status: 'Paid',    date: '2026-04-09' },
  { id: 'INV-0046', customer: 'TechBridge Kenya',    amount: 8750,  status: 'Sent',    date: '2026-04-08' },
  { id: 'INV-0045', customer: 'Mara Logistics',      amount: 34000, status: 'Overdue', date: '2026-03-28' },
  { id: 'INV-0044', customer: 'Savannah Foods Inc',  amount: 5200,  status: 'Paid',    date: '2026-04-05' },
  { id: 'INV-0043', customer: 'Nairobi Media Group', amount: 17800, status: 'Draft',   date: '2026-04-10' },
  { id: 'INV-0042', customer: 'Elachi Supplies Ltd', amount: 9100,  status: 'Paid',    date: '2026-04-02' },
];

const MOCK_RECENT_TXN = [
  { desc: 'Payment from Elachi Supplies', type: 'credit', amount: 12500, date: '2026-04-09', acc: '4000 Sales Revenue' },
  { desc: 'Inventory Purchase – Stock',   type: 'debit',  amount: 4800,  date: '2026-04-08', acc: '5000 COGS' },
  { desc: 'Salary Disbursement',          type: 'debit',  amount: 18000, date: '2026-04-07', acc: '6100 Payroll Exp.' },
  { desc: 'Payment from TechBridge',      type: 'credit', amount: 8750,  date: '2026-04-06', acc: '1100 Accounts Rec.' },
  { desc: 'Utility Bills – April',        type: 'debit',  amount: 1200,  date: '2026-04-05', acc: '6200 Utilities' },
];

// Monthly revenue data for the chart
const CHART_DATA = [
  { month: 'Oct', revenue: 38000, expenses: 22000 },
  { month: 'Nov', revenue: 42000, expenses: 25000 },
  { month: 'Dec', revenue: 61000, expenses: 31000 },
  { month: 'Jan', revenue: 34000, expenses: 19000 },
  { month: 'Feb', revenue: 51000, expenses: 28000 },
  { month: 'Mar', revenue: 58000, expenses: 32000 },
  { month: 'Apr', revenue: 47000, expenses: 24000 },
];

const NAV_ITEMS = [
  { icon: '📊', label: 'Dashboard',    path: '/',           active: true  },
  { icon: '📄', label: 'Invoices',     path: '/invoices',   active: false },
  { icon: '👥', label: 'Customers',    path: '/customers',  active: false },
  { icon: '📦', label: 'Inventory',    path: '/inventory',  active: false },
  { icon: '🧾', label: 'Expenses',     path: '/expenses',   active: false },
  { icon: '📒', label: 'Ledger',       path: '/ledger',     active: false },
  { icon: '📈', label: 'Reports',      path: '/reports',    active: false },
  { icon: '⚙️', label: 'Settings',     path: '/settings',   active: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n, currency = 'KES') =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

const statusColor = (s) =>
  ({ Paid: '#10b981', Sent: '#3b82f6', Overdue: '#ef4444', Draft: '#94a3b8', Void: '#64748b' }[s] || '#94a3b8');

// ── Inline Bar Chart (no external lib) ────────────────────────────────────────
function BarChart({ data }) {
  const maxVal = Math.max(...data.flatMap(d => [d.revenue, d.expenses]));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '160px', width: '100%' }}>
      {data.map((d) => (
        <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', width: '100%', justifyContent: 'center', flex: 1 }}>
            <div title={`Revenue: ${fmt(d.revenue)}`} style={{
              flex: 1, maxWidth: '16px', borderRadius: '4px 4px 0 0',
              height: `${(d.revenue / maxVal) * 100}%`,
              background: 'linear-gradient(180deg, #10b981, #059669)',
              transition: 'height 0.6s ease', cursor: 'pointer',
              position: 'relative', minHeight: '4px',
            }} />
            <div title={`Expenses: ${fmt(d.expenses)}`} style={{
              flex: 1, maxWidth: '16px', borderRadius: '4px 4px 0 0',
              height: `${(d.expenses / maxVal) * 100}%`,
              background: 'linear-gradient(180deg, #ef4444, #dc2626)',
              transition: 'height 0.6s ease', cursor: 'pointer',
              minHeight: '4px',
            }} />
          </div>
          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{d.month}</span>
        </div>
      ))}
    </div>
  );
}

// ── Donut Chart (pure CSS/SVG) ────────────────────────────────────────────────
function DonutChart({ paid, outstanding, overdue }) {
  const total = paid + outstanding + overdue;
  const toAngle = (v) => (v / total) * 360;

  const segments = [
    { value: paid,        color: '#10b981', label: 'Paid'        },
    { value: outstanding, color: '#f59e0b', label: 'Outstanding' },
    { value: overdue,     color: '#ef4444', label: 'Overdue'     },
  ];

  let cumAngle = -90;
  const r = 52, cx = 64, cy = 64;

  const polarToXY = (angle, radius) => ({
    x: cx + radius * Math.cos((angle * Math.PI) / 180),
    y: cy + radius * Math.sin((angle * Math.PI) / 180),
  });

  const arcs = segments.map((seg) => {
    const startAngle = cumAngle;
    const sweep = toAngle(seg.value);
    cumAngle += sweep;
    const endAngle = cumAngle;
    const large = sweep > 180 ? 1 : 0;
    const s = polarToXY(startAngle, r);
    const e = polarToXY(endAngle, r);
    return { ...seg, d: `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z` };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
      <svg width="128" height="128" viewBox="0 0 128 128">
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill={a.color} opacity={0.9}>
            <title>{a.label}: {a.value}</title>
          </path>
        ))}
        <circle cx={cx} cy={cy} r={32} fill="#1e293b" />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#f1f5f9" fontSize="14" fontWeight="700">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b" fontSize="9">invoices</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {segments.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{s.label}</span>
            <span style={{ color: '#f1f5f9', fontSize: '0.8rem', fontWeight: 600, marginLeft: 'auto' }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState('/');
  const [session, setSession] = useState(null);
  const [company, setCompany] = useState(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const s = localStorage.getItem('pro_erp_session');
    const c = localStorage.getItem('pro_erp_company');
    if (s) setSession(JSON.parse(s));
    if (c) setCompany(JSON.parse(c));
    const ticker = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(ticker);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('pro_erp_session');
    navigate('/login');
  };

  const currency = company?.currency || 'KES';

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const S = {
    shell: {
      display: 'flex', height: '100vh', overflow: 'hidden',
      background: '#0f172a', fontFamily: "'Inter', sans-serif",
    },
    sidebar: {
      width: sidebarOpen ? '240px' : '68px',
      background: '#1e293b',
      borderRight: '1px solid #334155',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.25s ease',
      overflow: 'hidden', flexShrink: 0,
    },
    sidebarTop: {
      padding: sidebarOpen ? '1.25rem 1.25rem 1rem' : '1.25rem 0.85rem 1rem',
      borderBottom: '1px solid #334155',
      display: 'flex', alignItems: 'center',
      gap: '0.75rem', overflow: 'hidden',
    },
    logo: {
      width: 36, height: 36, borderRadius: '10px',
      background: 'linear-gradient(135deg, #10b981, #059669)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.1rem', flexShrink: 0,
    },
    logoText: {
      display: sidebarOpen ? 'block' : 'none',
      overflow: 'hidden', whiteSpace: 'nowrap',
    },
    navList: { flex: 1, padding: '0.75rem 0', overflowY: 'auto' },
    navItem: (active) => ({
      display: 'flex', alignItems: 'center',
      gap: '0.75rem',
      padding: sidebarOpen ? '0.65rem 1.25rem' : '0.65rem 0',
      justifyContent: sidebarOpen ? 'flex-start' : 'center',
      cursor: 'pointer',
      background: active ? 'rgba(16,185,129,0.12)' : 'transparent',
      borderRight: active ? '3px solid #10b981' : '3px solid transparent',
      transition: 'all 0.15s',
      color: active ? '#10b981' : '#94a3b8',
      fontWeight: active ? 600 : 400,
      fontSize: '0.88rem',
      userSelect: 'none',
      whiteSpace: 'nowrap',
    }),
    main: {
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    },
    topbar: {
      height: '60px', background: '#1e293b',
      borderBottom: '1px solid #334155',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem', flexShrink: 0,
    },
    content: {
      flex: 1, overflowY: 'auto',
      padding: '1.5rem',
      display: 'flex', flexDirection: 'column', gap: '1.25rem',
    },
    kpiGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '1rem',
    },
    kpiCard: (color) => ({
      background: '#1e293b',
      border: `1px solid #334155`,
      borderTop: `3px solid ${color}`,
      borderRadius: '12px',
      padding: '1.1rem 1.25rem',
      display: 'flex', flexDirection: 'column', gap: '0.5rem',
      transition: 'transform 0.15s, box-shadow 0.15s',
      cursor: 'default',
    }),
    card: {
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '12px',
      padding: '1.25rem',
    },
    cardTitle: {
      color: '#94a3b8', fontSize: '0.8rem',
      fontWeight: 600, letterSpacing: '0.05em',
      textTransform: 'uppercase', marginBottom: '1rem',
    },
    badge: (color) => ({
      display: 'inline-block',
      padding: '0.2rem 0.6rem',
      borderRadius: '999px',
      background: `${color}20`,
      color, fontSize: '0.75rem', fontWeight: 600,
    }),
  };

  return (
    <div style={S.shell}>
      {/* ── Sidebar ── */}
      <aside style={S.sidebar}>
        {/* Logo */}
        <div style={S.sidebarTop}>
          <div style={S.logo}>🛡️</div>
          <div style={S.logoText}>
            <div style={{ color: '#10b981', fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.2 }}>Pro ERP</div>
            <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{company?.name || 'Accounting'}</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={S.navList}>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.path}
              style={S.navItem(activeNav === item.path)}
              onClick={() => setActiveNav(item.path)}
              onMouseEnter={e => { if (activeNav !== item.path) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (activeNav !== item.path) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </div>
          ))}
        </nav>

        {/* Sidebar bottom */}
        <div style={{ padding: sidebarOpen ? '1rem 1.25rem' : '1rem 0', borderTop: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: sidebarOpen ? 'flex-start' : 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
            {session?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          {sidebarOpen && (
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session?.name || 'Admin'}</div>
              <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{session?.role || 'admin'}</div>
            </div>
          )}
          {sidebarOpen && (
            <button onClick={handleLogout} title="Sign out" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem', padding: '2px 4px' }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
            >⏻</button>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={S.main}>
        {/* Topbar */}
        <header style={S.topbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem', padding: '4px 6px', borderRadius: '6px' }}
              onMouseEnter={e => e.currentTarget.style.background = '#334155'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >☰</button>
            <h1 style={{ color: '#f1f5f9', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              {greeting()}, {session?.name?.split(' ')[0] || 'Admin'} 👋
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.82rem' }}>
              {now.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <button id="new-invoice-btn" style={{
              padding: '0.5rem 1rem', background: '#10b981', border: 'none',
              borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '0.85rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#059669'}
              onMouseLeave={e => e.currentTarget.style.background = '#10b981'}
            >
              + New Invoice
            </button>
          </div>
        </header>

        {/* Content */}
        <div style={S.content}>

          {/* ── KPI Cards ── */}
          <div style={S.kpiGrid}>
            {Object.entries(MOCK_STATS).map(([key, stat]) => (
              <div key={key} style={S.kpiCard(stat.color)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.3)`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.4rem' }}>{stat.icon}</span>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 600,
                    color: stat.change >= 0 ? '#10b981' : '#ef4444',
                    background: stat.change >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    padding: '2px 8px', borderRadius: '999px',
                  }}>
                    {stat.change >= 0 ? '▲' : '▼'} {Math.abs(stat.change)}{typeof stat.change === 'number' && stat.change % 1 !== 0 ? '%' : ''}
                  </span>
                </div>
                <div style={{ color: '#f1f5f9', fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.1 }}>
                  {key === 'revenue' || key === 'outstanding' || key === 'expenses'
                    ? fmt(stat.value, currency)
                    : stat.value}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* ── Row 2: Chart + Donut ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.25rem' }}>
            {/* Revenue Chart */}
            <div style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ ...S.cardTitle, margin: 0 }}>Revenue vs Expenses (Last 7 Months)</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  {[['#10b981', 'Revenue'], ['#ef4444', 'Expenses']].map(([c, l]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '2px', background: c }} />
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
              <BarChart data={CHART_DATA} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', borderTop: '1px solid #334155', paddingTop: '0.75rem' }}>
                {[
                  { label: 'Gross Profit', value: fmt(284500 - 52300, currency), color: '#10b981' },
                  { label: 'Profit Margin', value: '81.6%', color: '#3b82f6' },
                  { label: 'Avg Invoice', value: fmt(6053, currency), color: '#f59e0b' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ color: s.color, fontSize: '1rem', fontWeight: 700 }}>{s.value}</div>
                    <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Invoice Status Donut */}
            <div style={S.card}>
              <h2 style={S.cardTitle}>Invoice Status</h2>
              <DonutChart paid={29} outstanding={12} overdue={6} />
              <div style={{ marginTop: '1rem', borderTop: '1px solid #334155', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Total Outstanding</span>
                  <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem' }}>{fmt(38200, currency)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Overdue Amount</span>
                  <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.85rem' }}>{fmt(34000, currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Row 3: Recent Invoices + Journal Feed ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem' }}>
            {/* Recent Invoices Table */}
            <div style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ ...S.cardTitle, margin: 0 }}>Recent Invoices</h2>
                <button style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: '6px', padding: '4px 12px', fontSize: '0.78rem', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#64748b'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
                >View All</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    {['Invoice #', 'Customer', 'Amount', 'Status', 'Date'].map(h => (
                      <th key={h} style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, textAlign: 'left', padding: '0 0 0.6rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_RECENT_INVOICES.map((inv, i) => (
                    <tr key={inv.id} style={{ borderBottom: i < MOCK_RECENT_INVOICES.length - 1 ? '1px solid #1e3a4a22' : 'none' }}>
                      <td style={{ padding: '0.65rem 0', color: '#3b82f6', fontSize: '0.83rem', fontWeight: 600 }}>{inv.id}</td>
                      <td style={{ padding: '0.65rem 0.5rem', color: '#f1f5f9', fontSize: '0.83rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{inv.customer}</td>
                      <td style={{ padding: '0.65rem 0.5rem', color: '#f1f5f9', fontSize: '0.83rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(inv.amount, currency)}</td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        <span style={S.badge(statusColor(inv.status))}>{inv.status}</span>
                      </td>
                      <td style={{ padding: '0.65rem 0', color: '#64748b', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{inv.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Recent Transactions */}
            <div style={S.card}>
              <h2 style={S.cardTitle}>Recent Journal Entries</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {MOCK_RECENT_TXN.map((txn, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: i < MOCK_RECENT_TXN.length - 1 ? '0.75rem' : 0, borderBottom: i < MOCK_RECENT_TXN.length - 1 ? '1px solid #334155' : 'none' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                      background: txn.type === 'credit' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem',
                    }}>
                      {txn.type === 'credit' ? '⬆️' : '⬇️'}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{txn.desc}</div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{txn.acc}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ color: txn.type === 'credit' ? '#10b981' : '#ef4444', fontSize: '0.83rem', fontWeight: 700 }}>
                        {txn.type === 'credit' ? '+' : '-'}{fmt(txn.amount, currency)}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{txn.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Row 4: Quick Actions ── */}
          <div style={S.card}>
            <h2 style={{ ...S.cardTitle, marginBottom: '0.75rem' }}>Quick Actions</h2>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {[
                { icon: '📄', label: 'New Invoice',    color: '#3b82f6', id: 'qa-invoice'    },
                { icon: '👤', label: 'Add Customer',   color: '#10b981', id: 'qa-customer'   },
                { icon: '📦', label: 'Add Product',    color: '#8b5cf6', id: 'qa-product'    },
                { icon: '💸', label: 'Record Payment', color: '#f59e0b', id: 'qa-payment'    },
                { icon: '🧾', label: 'Log Expense',    color: '#ef4444', id: 'qa-expense'    },
                { icon: '📒', label: 'Journal Entry',  color: '#06b6d4', id: 'qa-journal'    },
                { icon: '📈', label: 'Run Report',     color: '#64748b', id: 'qa-report'     },
              ].map((a) => (
                <button key={a.id} id={a.id}
                  style={{
                    padding: '0.6rem 1.1rem',
                    background: `${a.color}18`,
                    border: `1px solid ${a.color}40`,
                    borderRadius: '10px', color: a.color,
                    fontWeight: 600, fontSize: '0.83rem',
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', gap: '0.4rem',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${a.color}30`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${a.color}18`; e.currentTarget.style.transform = 'none'; }}
                >
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', color: '#334155', fontSize: '0.75rem', paddingBottom: '0.5rem' }}>
            Pro Accounting &amp; ERP v2.0 — {company?.name || 'Your Company'} · Offline & Cloud Ready
          </div>
        </div>
      </main>
    </div>
  );
}

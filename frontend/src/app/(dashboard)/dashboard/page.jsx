'use client';

import { useEffect, useState } from 'react';
import { getDashboardStats } from '@/lib/actions/dashboard';
import { formatCurrency, formatDate, INVOICE_STATUS_STYLES } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, IndianRupee, Users, Package,
  CreditCard, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Activity, Zap, BookOpen, FileText, ShoppingCart, Banknote,
  Boxes, Factory, Truck, Receipt, Settings, LogOut, LayoutDashboard, BarChart3, Database, Undo2
} from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, trend, trendLabel, color = 'primary', loading }) {
  const colors = {
    primary: 'from-primary/20 to-primary/5 border-primary/30',
    success: 'from-success/20 to-success/5 border-success/30',
    warning: 'from-warning/20 to-warning/5 border-warning/30',
    danger:  'from-danger/20  to-danger/5  border-danger/30',
  };
  const iconColors = {
    primary: 'bg-primary/20 text-primary-light',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    danger:  'bg-danger/20  text-danger',
  };

  return (
    <div className={`card-hover p-6 bg-gradient-to-br ${colors[color]}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColors[color]}`}>
          <Icon size={20}/>
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
            {trend >= 0 ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {loading
        ? <div className="h-7 w-28 bg-white/5 rounded-lg animate-pulse mb-1"/>
        : <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      }
      <p className="text-sm text-muted mt-1">{label}</p>
      {trendLabel && <p className="text-xs text-muted/60 mt-0.5">{trendLabel}</p>}
    </div>
  );
}

const CHART_COLORS = ['var(--color-success)', 'var(--color-primary)', 'var(--color-muted)', 'var(--color-danger)'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 border border-border text-xs shadow-card">
      <p className="text-muted mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    const res = await getDashboardStats();
    if (res.success) {
      setStats(res.data);
    }
    setLoading(false);
  };

  // KPI computations from stats or defaults
  const totalAR        = stats?.totalAR || 0;
  const totalAP        = stats?.totalAP || 0;
  const totalRevenue   = stats?.revenueMTD || 0;
  const lowStockCount  = stats?.lowStockCount || 0;
  const chartData      = stats?.chartData || [];
  const invoices       = stats?.recentInvoices || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your financial overview for this month</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-success bg-success/10 border border-success/20 px-3 py-1.5 rounded-full">
            <Zap size={11} className="fill-success"/> Live Data
          </span>
        </div>
      </div>

      {/* Navigation Modules */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Modules</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
          <Link href="/accounts" className="card-hover p-4 bg-surface flex flex-col items-center justify-center gap-3 rounded-xl border border-border hover:border-primary/50 transition-all text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary-light flex items-center justify-center">
              <BookOpen size={20}/>
            </div>
            <span className="text-xs font-medium text-slate-200">Chart of Accounts</span>
          </Link>
          <Link href="/journals" className="card-hover p-4 bg-surface flex flex-col items-center justify-center gap-3 rounded-xl border border-border hover:border-primary/50 transition-all text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary-light flex items-center justify-center">
              <FileText size={20}/>
            </div>
            <span className="text-xs font-medium text-slate-200">Journal Entries</span>
          </Link>
          <Link href="/customers" className="card-hover p-4 bg-surface flex flex-col items-center justify-center gap-3 rounded-xl border border-border hover:border-primary/50 transition-all text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary-light flex items-center justify-center">
              <Users size={20}/>
            </div>
            <span className="text-xs font-medium text-slate-200">Customers</span>
          </Link>
          <Link href="/invoices" className="card-hover p-4 bg-surface flex flex-col items-center justify-center gap-3 rounded-xl border border-border hover:border-primary/50 transition-all text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary-light flex items-center justify-center">
              <ShoppingCart size={20}/>
            </div>
            <span className="text-xs font-medium text-slate-200">Invoices</span>
          </Link>
          <Link href="/receipts" className="card-hover p-4 bg-surface flex flex-col items-center justify-center gap-3 rounded-xl border border-border hover:border-primary/50 transition-all text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary-light flex items-center justify-center">
              <Banknote size={20}/>
            </div>
            <span className="text-xs font-medium text-slate-200">Receipts</span>
          </Link>
          <Link href="/inventory" className="card-hover p-4 bg-surface flex flex-col items-center justify-center gap-3 rounded-xl border border-border hover:border-primary/50 transition-all text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary-light flex items-center justify-center">
              <Boxes size={20}/>
            </div>
            <span className="text-xs font-medium text-slate-200">Global Inventory</span>
          </Link>
          <Link href="/production-studio" className="card-hover p-4 bg-surface flex flex-col items-center justify-center gap-3 rounded-xl border border-border hover:border-primary/50 transition-all text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary-light flex items-center justify-center">
              <Factory size={20}/>
            </div>
            <span className="text-xs font-medium text-slate-200">Production Studio</span>
          </Link>
          <Link href="/suppliers" className="card-hover p-4 bg-surface flex flex-col items-center justify-center gap-3 rounded-xl border border-border hover:border-primary/50 transition-all text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary-light flex items-center justify-center">
              <Truck size={20}/>
            </div>
            <span className="text-xs font-medium text-slate-200">Suppliers</span>
          </Link>
          <Link href="/bills" className="card-hover p-4 bg-surface flex flex-col items-center justify-center gap-3 rounded-xl border border-border hover:border-primary/50 transition-all text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary-light flex items-center justify-center">
              <Receipt size={20}/>
            </div>
            <span className="text-xs font-medium text-slate-200">Bills</span>
          </Link>
          <Link href="/returns" className="card-hover p-4 bg-surface flex flex-col items-center justify-center gap-3 rounded-xl border border-border hover:border-warning/50 transition-all text-center">
            <div className="w-10 h-10 rounded-full bg-warning/10 text-warning flex items-center justify-center">
              <Undo2 size={20}/>
            </div>
            <span className="text-xs font-medium text-slate-200">Returns</span>
          </Link>
          <Link href="/settings" className="card-hover p-4 bg-surface flex flex-col items-center justify-center gap-3 rounded-xl border border-border hover:border-primary/50 transition-all text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary-light flex items-center justify-center">
              <Settings size={20}/>
            </div>
            <span className="text-xs font-medium text-slate-200">Settings</span>
          </Link>
          <Link href="/settings/database" className="card-hover p-4 bg-surface flex flex-col items-center justify-center gap-3 rounded-xl border border-border hover:border-primary/50 transition-all text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary-light flex items-center justify-center">
              <Database size={20}/>
            </div>
            <span className="text-xs font-medium text-slate-200">Cloud DB</span>
          </Link>
          <button onClick={() => signOut()} className="card-hover p-4 bg-surface flex flex-col items-center justify-center gap-3 rounded-xl border border-border hover:border-danger/50 transition-all text-center">
            <div className="w-10 h-10 rounded-full bg-danger/10 text-danger flex items-center justify-center">
              <LogOut size={20}/>
            </div>
            <span className="text-xs font-medium text-danger">Sign Out</span>
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard loading={loading} label="Revenue (MTD)"     value={formatCurrency(totalRevenue)} icon={TrendingUp}    color="primary" trend={12} trendLabel="vs last month"/>
        <StatCard loading={loading} label="AR Outstanding"    value={formatCurrency(totalAR)}      icon={IndianRupee}   color="warning"/>
        <StatCard loading={loading} label="AP Outstanding"    value={formatCurrency(totalAP)}      icon={CreditCard}       color="danger"/>
        <StatCard loading={loading} label="Low Stock Alerts"  value={lowStockCount}               icon={AlertTriangle} color={lowStockCount > 0 ? 'danger' : 'success'}/>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue chart */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-white">Revenue Trend</h3>
              <p className="text-xs text-muted mt-0.5">Last 6 months — Paid invoices</p>
            </div>
            <Activity size={16} className="text-muted"/>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-primary)" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} vertical={false}/>
              <XAxis dataKey="month" tick={{ fill: 'var(--color-muted)', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10}/>
              <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} dx={-10}/>
              <Tooltip content={<CustomTooltip/>} cursor={{ stroke: 'var(--color-border)', strokeWidth: 1, strokeDasharray: '5 5' }}/>
              <Area type="monotone" dataKey="Revenue" stroke="var(--color-primary)" strokeWidth={3} fill="url(#revGrad)" activeDot={{ r: 6, fill: 'var(--color-primary)', stroke: 'var(--color-surface)', strokeWidth: 3 }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Invoice Status Breakdown */}
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-1">Invoices This Month</h3>
          <p className="text-xs text-muted mb-6">{invoices.length} invoices total</p>
          {loading
            ? <div className="space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="h-4 bg-white/5 rounded animate-pulse"/>)}</div>
            : (() => {
                const statuses = ['Paid','Sent','Draft','Overdue'];
                const counts   = statuses.map(s => ({ s, n: invoices.filter(i => i.status === s).length }));
                const total    = invoices.length || 1;
                return (
                  <div className="space-y-4">
                    {counts.map(({ s, n }, i) => (
                      <div key={s}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={`badge ${INVOICE_STATUS_STYLES[s]}`}>{s}</span>
                          <span className="text-muted">{n} ({Math.round(n/total*100)}%)</span>
                        </div>
                        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.round(n/total*100)}%`, background: CHART_COLORS[i] }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
          }
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Recent Invoices</h3>
          <a href="/invoices" className="text-xs text-primary-light hover:underline">View all</a>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(5)].map((_, j) => (
                        <td key={j}><div className="h-4 bg-white/5 rounded animate-pulse"/></td>
                      ))}
                    </tr>
                  ))
                : invoices.slice(0, 8).map(inv => (
                    <tr key={inv.id}>
                      <td className="font-mono text-primary-light text-xs">{inv.invoice_number}</td>
                      <td className="font-medium text-slate-200">{inv.customer_name || '—'}</td>
                      <td className="text-muted text-xs">{formatDate(inv.issue_date)}</td>
                      <td><span className={`badge ${INVOICE_STATUS_STYLES[inv.status]}`}>{inv.status}</span></td>
                      <td className="text-right font-semibold tabular-nums">{formatCurrency(inv.total_amount)}</td>
                    </tr>
                  ))
              }
              {!loading && invoices.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted py-8">No invoices this month</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

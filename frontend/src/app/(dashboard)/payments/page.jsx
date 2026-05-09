'use client';

import { useEffect, useState } from 'react';
import { paymentsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, Filter, CheckCircle, XCircle, Clock, Wallet, Banknote } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const STATUS_ICONS = {
  Pending:  <Clock size={14} className="text-warning"/>,
  Cleared:  <CheckCircle size={14} className="text-success"/>,
  Returned: <XCircle size={14} className="text-danger"/>,
  Void:     <XCircle size={14} className="text-muted"/>,
};

const STATUS_STYLES = {
  Pending:  'badge-warning',
  Cleared:  'badge-success',
  Returned: 'badge-danger',
  Void:     'badge-muted',
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('All'); // All, Receipt, Payment

  const fetchPayments = () => {
    setLoading(true);
    const params = {};
    if (filter !== 'All') params.type = filter;
    
    paymentsApi.list(params)
      .then(r => setPayments(r.data.payments))
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPayments(); }, [filter]);

  const filtered = payments.filter(p => 
    !search || 
    p.reference_no?.toLowerCase().includes(search.toLowerCase()) ||
    p.notes?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments &amp; Receipts</h1>
          <p className="page-subtitle">Track all incoming and outgoing funds</p>
        </div>
        <div className="flex gap-2">
           <Link href="/payments/new" className="btn-primary">
            <Plus size={16}/> Record Transaction
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
          <input 
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search reference or notes…" 
            className="input pl-9"
          />
        </div>
        <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
          {['All', 'Receipt', 'Payment'].map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === t ? 'bg-gradient-primary text-white shadow-glow-sm' : 'text-muted hover:text-white'}`}>
              {t}s
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Method</th>
                <th>Entity</th>
                <th>Reference</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(6)].map((_,i) => <tr key={i}>{[...Array(8)].map((_,j) => <td key={j}><div className="h-4 bg-white/5 rounded animate-pulse"/></td>)}</tr>)
                : filtered.map(p => (
                  <tr key={p.id} className="group">
                    <td className="text-xs text-muted font-medium">{formatDate(p.payment_date)}</td>
                    <td>
                      <span className={`flex items-center gap-1.5 text-xs font-bold ${p.type === 'Receipt' ? 'text-success' : 'text-danger'}`}>
                        {p.type === 'Receipt' ? <Banknote size={12}/> : <Wallet size={12}/>}
                        {p.type.toUpperCase()}
                      </span>
                    </td>
                    <td>
                       <span className="text-xs text-slate-300 bg-white/5 px-2 py-1 rounded border border-white/5">
                        {p.method}
                      </span>
                    </td>
                    <td className="text-sm font-medium text-slate-200">
                      {p.entity_type}: <span className="text-muted font-normal">{p.entity_id.slice(0,8)}...</span>
                    </td>
                    <td className="text-xs text-muted font-mono">{p.reference_no || '—'}</td>
                    <td>
                      <span className={`badge ${STATUS_STYLES[p.status]} gap-1`}>
                        {STATUS_ICONS[p.status]}
                        {p.status}
                      </span>
                    </td>
                    <td className={`text-right tabular-nums font-bold ${p.type === 'Receipt' ? 'text-success' : 'text-danger'}`}>
                      {p.type === 'Receipt' ? '+' : '-'}{formatCurrency(p.amount)}
                    </td>
                    <td className="text-right">
                      {p.method === 'Cheque' && p.status === 'Pending' && (
                        <Link href="/cheques" className="text-xs text-primary-light hover:underline font-medium">
                          Verify
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              }
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-16">
                    <Banknote size={40} className="mx-auto mb-3 opacity-20"/>
                    <p>No transactions found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

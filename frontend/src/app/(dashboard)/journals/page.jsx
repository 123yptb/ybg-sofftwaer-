'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus, History, Calendar, FileText,
  Pencil, Trash2, X, CheckCircle2, AlertCircle, Save
} from 'lucide-react';
import { getJournals, updateJournalVoucher, deleteJournalVoucher } from '@/lib/actions/journals';
import { getAccounts } from '@/lib/actions/accounts';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ tx, accounts, onClose, onSaved }) {
  const [description, setDescription] = useState(tx.description);
  const [date, setDate]               = useState(tx.date.split('T')[0]);
  const [entries, setEntries]         = useState(
    tx.entries.map(e => ({ id: e.id, accountId: e.accountId, type: e.type, amount: String(e.amount) }))
  );
  const [saving, setSaving] = useState(false);

  const updateEntry = (idx, field, val) =>
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e));
  const addLine = () =>
    setEntries(prev => [...prev, { id: Date.now(), accountId: '', type: 'DEBIT', amount: '' }]);
  const removeLine = (idx) =>
    setEntries(prev => prev.filter((_, i) => i !== idx));

  const { totalDebit, totalCredit, difference } = useMemo(() => {
    let d = 0, c = 0;
    entries.forEach(e => {
      const amt = Number(e.amount) || 0;
      if (e.type === 'DEBIT') d += amt; else c += amt;
    });
    return { totalDebit: d, totalCredit: c, difference: Math.abs(d - c) };
  }, [entries]);

  const isBalanced = difference < 0.001 && totalDebit > 0
    && entries.every(e => e.accountId && Number(e.amount) > 0);

  const handleSave = async () => {
    if (!isBalanced) { toast.error('Entries must be balanced before saving.'); return; }
    setSaving(true);
    const res = await updateJournalVoucher(tx.id, {
      description, date,
      entries: entries.map(e => ({ accountId: e.accountId, type: e.type, amount: Number(e.amount) }))
    });
    setSaving(false);
    if (res.success) { toast.success('✅ Voucher updated!'); onSaved(); onClose(); }
    else toast.error(res.error);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl p-0 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-primary/10 to-transparent">
          <div>
            <h2 className="font-bold text-white text-base flex items-center gap-2">
              <Pencil size={15} className="text-primary-light"/> Edit Journal Voucher
            </h2>
            <p className="text-xs text-muted mt-0.5">{tx.reference} — Balances will be reversed & reposted</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={17}/></button>
        </div>

        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input w-full"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Opening Capital" className="input w-full"/>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">Entries</label>
            {entries.map((entry, idx) => (
              <div key={entry.id} className="flex items-center gap-2">
                <select id={`edit-journal-account-select-${idx}`} value={entry.accountId} onChange={e => updateEntry(idx, 'accountId', e.target.value)}
                  className="input flex-1 text-sm">
                  <option value="">— Select Account —</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.accountCode} – {a.name}</option>
                  ))}
                </select>
                <button
                  id={`edit-journal-type-btn-${idx}`}
                  onClick={() => updateEntry(idx, 'type', entry.type === 'DEBIT' ? 'CREDIT' : 'DEBIT')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border min-w-[70px] text-center transition-colors ${
                    entry.type === 'DEBIT'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                  }`}>{entry.type}</button>
                <input id={`edit-journal-amount-input-${idx}`} type="number" step="0.01" placeholder="0.00" value={entry.amount}
                  onChange={e => updateEntry(idx, 'amount', e.target.value)}
                  className="input w-32 text-right font-mono"/>
                <button onClick={() => removeLine(idx)} disabled={entries.length <= 2}
                  className="btn-icon text-muted hover:text-rose-400 disabled:opacity-30">
                  <Trash2 size={14}/>
                </button>
              </div>
            ))}
            <button onClick={addLine} className="text-xs text-primary-light hover:text-white flex items-center gap-1 mt-1 transition-colors">
              <Plus size={13}/> Add Line
            </button>
          </div>

          {/* Totals bar */}
          <div className="flex items-center gap-6 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm">
            <div><span className="text-xs text-muted">DR </span>
              <span className="font-bold text-emerald-400 tabular-nums">{formatCurrency(totalDebit)}</span></div>
            <div><span className="text-xs text-muted">CR </span>
              <span className="font-bold text-rose-400 tabular-nums">{formatCurrency(totalCredit)}</span></div>
            <div className={`flex items-center gap-1 text-xs font-semibold ml-auto ${difference < 0.001 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {difference < 0.001 ? <CheckCircle2 size={13}/> : <AlertCircle size={13}/>}
              {difference < 0.001 ? 'Balanced ✓' : `Diff: ${formatCurrency(difference)}`}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/[0.01]">
          <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button onClick={handleSave} disabled={!isBalanced || saving}
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50">
            {saving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Save size={14}/>}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Journal Card ──────────────────────────────────────────────────────────────
function JournalCard({ tx, onEdit, onDelete }) {
  const totalDebit  = tx.entries.filter(e => e.type === 'DEBIT').reduce((s, e) => s + e.amount, 0);
  const totalCredit = tx.entries.filter(e => e.type === 'CREDIT').reduce((s, e) => s + e.amount, 0);

  return (
    <div className="card p-0 border border-white/10 overflow-hidden hover:border-primary/30 transition-all duration-200 shadow-lg">
      {/* Card Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-white/[0.025]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary-light border border-primary/20">
            <FileText size={15}/>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">{tx.reference}</span>
              <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">POSTED</span>
            </div>
            <p className="text-xs text-muted mt-0.5">{tx.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted mr-3">{formatDate(tx.date)}</span>
          <button onClick={() => onEdit(tx)} className="btn-icon w-7 h-7 text-muted hover:text-primary-light" title="Edit">
            <Pencil size={13}/>
          </button>
          <button onClick={() => onDelete(tx.id, tx.reference)} className="btn-icon w-7 h-7 text-muted hover:text-rose-400" title="Delete">
            <Trash2 size={13}/>
          </button>
        </div>
      </div>

      {/* Entries */}
      <div className="divide-y divide-white/[0.04]">
        {tx.entries.map(entry => (
          <div key={entry.id} className="flex items-center px-5 py-2.5 hover:bg-white/[0.015] transition-colors">
            {/* Type pill */}
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mr-3 ${
              entry.type === 'DEBIT'
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-rose-500/10 text-rose-400'
            }`}>{entry.type === 'DEBIT' ? 'DR' : 'CR'}</span>

            {/* Account */}
            <div className="flex-1 min-w-0">
              <span className="text-sm text-white font-medium">{entry.account.name}</span>
              <span className="text-[10px] text-muted ml-2">#{entry.account.accountCode}</span>
            </div>

            {/* Amount */}
            <span className={`tabular-nums font-semibold text-sm ${
              entry.type === 'DEBIT' ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {entry.type === 'DEBIT' ? '+' : '−'} {formatCurrency(entry.amount)}
            </span>
          </div>
        ))}
      </div>

      {/* Footer totals */}
      <div className="flex items-center justify-between px-5 py-2.5 border-t border-white/5 bg-white/[0.01] text-xs">
        <span className="text-muted">ID: {tx.id.slice(-10)}</span>
        <div className="flex items-center gap-6">
          <span className="text-muted">Total DR: <strong className="text-emerald-400 tabular-nums">{formatCurrency(totalDebit)}</strong></span>
          <span className="text-muted">Total CR: <strong className="text-rose-400 tabular-nums">{formatCurrency(totalCredit)}</strong></span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function JournalsPage() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filters, setFilters]           = useState({ fromDate: '', toDate: '' });
  const [editingTx, setEditingTx]       = useState(null);

  useEffect(() => {
    loadJournals();
    getAccounts().then(r => { if (r.success) setAccounts(r.data); });
  }, []);

  const loadJournals = async (f = filters) => {
    setLoading(true);
    const res = await getJournals(f);
    if (res.success) setTransactions(res.data);
    else toast.error(res.error);
    setLoading(false);
  };

  const handleDelete = async (id, ref) => {
    if (!confirm(`Delete ${ref}? This will reverse all account balance changes.`)) return;
    const res = await deleteJournalVoucher(id);
    if (res.success) { toast.success('Voucher deleted & balances reversed.'); loadJournals(); }
    else toast.error(res.error);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      {editingTx && (
        <EditModal tx={editingTx} accounts={accounts}
          onClose={() => setEditingTx(null)} onSaved={loadJournals}/>
      )}

      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Journal Entries</h1>
          <p className="text-muted mt-1 text-sm">General Ledger — all double-entry transactions</p>
        </div>
        <Link href="/transactions/new" className="btn-primary flex items-center gap-2">
          <Plus size={17}/> New Journal Entry
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-3.5 mb-6 border border-white/5 flex items-center gap-3 flex-wrap">
        <Calendar size={15} className="text-muted"/>
        <input type="date" className="input-sm" value={filters.fromDate}
          onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))}/>
        <span className="text-muted text-sm">→</span>
        <input type="date" className="input-sm" value={filters.toDate}
          onChange={e => setFilters(f => ({ ...f, toDate: e.target.value }))}/>
        <button onClick={() => loadJournals()}
          className="px-3.5 py-1.5 text-xs font-semibold bg-primary/20 hover:bg-primary/30 text-primary-light rounded-lg transition-colors">
          Filter
        </button>
        {(filters.fromDate || filters.toDate) && (
          <button onClick={() => { const f = { fromDate: '', toDate: '' }; setFilters(f); loadJournals(f); }}
            className="text-xs text-muted hover:text-white transition-colors">
            × Clear
          </button>
        )}
        <span className="ml-auto text-xs text-muted">{transactions.length} voucher{transactions.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Journal Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-2 border-white/20 border-t-primary rounded-full animate-spin"/>
          </div>
        ) : transactions.length === 0 ? (
          <div className="card py-24 text-center border-white/5">
            <History size={40} className="mx-auto text-muted mb-4 opacity-20"/>
            <p className="text-muted font-medium">No journal entries found</p>
            <p className="text-xs text-muted/60 mt-1">Post your first voucher from New Journal Entry</p>
          </div>
        ) : (
          transactions.map(tx => (
            <JournalCard key={tx.id} tx={tx}
              onEdit={setEditingTx}
              onDelete={handleDelete}/>
          ))
        )}
      </div>
    </div>
  );
}

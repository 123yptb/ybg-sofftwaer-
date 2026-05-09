'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getReceipts, createReceipt,
  getCustomers, getInvoices,
} from '@/lib/actions/invoicesReceipts';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, Banknote, X, CheckCircle, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'UPI'];

const STATUS_STYLES = {
  Cleared: 'badge-success',
  Pending: 'badge-warning',
  Returned: 'badge-danger',
};
const STATUS_ICONS = {
  Cleared:  <CheckCircle size={13} className="text-success"/>,
  Pending:  <Clock size={13} className="text-warning"/>,
  Returned: <XCircle size={13} className="text-danger"/>,
};

// ── Receipt Modal ─────────────────────────────────────────────────────────────
function ReceiptModal({ customers, invoices, preCustomerId, preInvoiceId, onClose, onSaved }) {
  const [form, setForm] = useState({
    customerId: preCustomerId || '',
    invoiceId:  preInvoiceId  || '',
    amount:     '',
    method:     'Cash',
    reference:  '',
    notes:      '',
    date:       new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  // When customer changes → filter invoices
  const custInvoices = invoices.filter(
    inv => inv.customerId === form.customerId && !['Paid', 'Void'].includes(inv.status)
  );

  // When invoice selected → prefill amount
  const selectedInv = invoices.find(i => i.id === form.invoiceId);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setSaving(true);
    const res = await createReceipt(form);
    setSaving(false);
    if (res.success) {
      toast.success(`Receipt ${res.data.receiptNumber} recorded!`);
      onClose();
      onSaved();
    } else toast.error(res.error);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card w-full max-w-lg p-0 overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div>
            <h2 className="font-bold text-white text-lg">Record Receipt</h2>
            <p className="text-xs text-muted mt-0.5">Record a payment received from a customer</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18}/></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Customer */}
          <div className="input-group">
            <label className="input-label">Customer *</label>
            <select id="receipt-customer-select" value={form.customerId}
              onChange={e => set('customerId', e.target.value)} className="input">
              <option value="">— Select customer —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Invoice */}
          <div className="input-group">
            <label className="input-label">Against Invoice <span className="text-muted">(optional)</span></label>
            <select id="receipt-invoice-select" value={form.invoiceId}
              onChange={e => {
                const inv = invoices.find(i => i.id === e.target.value);
                set('invoiceId', e.target.value);
                if (inv) set('amount', inv.amountDue.toFixed(2));
              }} className="input" disabled={!form.customerId}>
              <option value="">— Unlinked / Advance —</option>
              {custInvoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — Due: {formatCurrency(inv.amountDue)}
                </option>
              ))}
            </select>
            {selectedInv && (
              <p className="text-xs text-warning mt-1">Outstanding: {formatCurrency(selectedInv.amountDue)}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <div className="input-group">
              <label className="input-label">Amount Received *</label>
              <input id="receipt-amount" type="number" min="0.01" step="0.01"
                value={form.amount} onChange={e => set('amount', e.target.value)}
                placeholder="0.00" className="input"/>
            </div>
            {/* Date */}
            <div className="input-group">
              <label className="input-label">Date *</label>
              <input id="receipt-date" type="date" value={form.date}
                onChange={e => set('date', e.target.value)} className="input"/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Method */}
            <div className="input-group">
              <label className="input-label">Payment Method</label>
              <select id="receipt-method" value={form.method}
                onChange={e => set('method', e.target.value)} className="input">
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {/* Reference */}
            <div className="input-group">
              <label className="input-label">Reference / Cheque No.</label>
              <input id="receipt-reference" value={form.reference}
                onChange={e => set('reference', e.target.value)}
                placeholder="e.g. CHQ-123456" className="input"/>
            </div>
          </div>

          {/* Notes */}
          <div className="input-group">
            <label className="input-label">Notes</label>
            <textarea id="receipt-notes" value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="input resize-none" rows={2} placeholder="Optional remarks…"/>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button id="receipt-submit-btn" onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Record Receipt'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ReceiptsPage() {
  const searchParams   = useSearchParams();
  const preInvoiceId   = searchParams.get('invoiceId')  || '';
  const preCustomerId  = searchParams.get('customerId') || '';

  const [receipts,   setReceipts]   = useState([]);
  const [customers,  setCustomers]  = useState([]);
  const [invoices,   setInvoices]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [showCreate, setShowCreate] = useState(!!preInvoiceId);

  const load = async () => {
    setLoading(true);
    const [rRes, cRes, iRes] = await Promise.all([getReceipts(), getCustomers(), getInvoices()]);
    if (rRes.success) setReceipts(rRes.data);
    if (cRes.success) setCustomers(cRes.data);
    if (iRes.success) setInvoices(iRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = receipts.filter(r => {
    const q = search.toLowerCase();
    return !q
      || r.receiptNumber.toLowerCase().includes(q)
      || r.customer?.name.toLowerCase().includes(q)
      || r.reference?.toLowerCase().includes(q);
  });

  return (
    <div>
      {showCreate && (
        <ReceiptModal
          customers={customers}
          invoices={invoices}
          preCustomerId={preCustomerId}
          preInvoiceId={preInvoiceId}
          onClose={() => setShowCreate(false)}
          onSaved={load}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Receipts</h1>
          <p className="page-subtitle">Track all incoming payments from customers</p>
        </div>
        <button id="new-receipt-btn" onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16}/> Record Receipt
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
        <input id="receipt-search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search receipts…" className="input pl-9"/>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Received', value: formatCurrency(receipts.reduce((s,r) => s + r.amount, 0)), color: 'from-success/20 to-success/5 border-success/30' },
          { label: 'This Month', value: formatCurrency(receipts.filter(r => new Date(r.date) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).reduce((s,r) => s + r.amount, 0)), color: 'from-primary/20 to-primary/5 border-primary/30' },
          { label: 'Total Receipts', value: receipts.length, color: 'from-warning/20 to-warning/5 border-warning/30' },
        ].map(c => (
          <div key={c.label} className={`card p-5 bg-gradient-to-br ${c.color}`}>
            <p className="text-2xl font-bold text-white tabular-nums">{c.value}</p>
            <p className="text-sm text-muted mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Invoice</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(5)].map((_,i) => <tr key={i}>{[...Array(8)].map((_,j) => <td key={j}><div className="h-4 bg-white/5 rounded animate-pulse"/></td>)}</tr>)
                : filtered.map(r => (
                  <tr key={r.id}>
                    <td className="font-mono text-success text-xs font-semibold">{r.receiptNumber}</td>
                    <td className="text-xs text-muted">{formatDate(r.date)}</td>
                    <td className="font-medium text-slate-200">{r.customer?.name}</td>
                    <td>
                      {r.invoice
                        ? <Link href={`/invoices/${r.invoice.id}`} className="text-xs text-primary-light hover:underline font-mono">{r.invoice.invoiceNumber}</Link>
                        : <span className="text-xs text-muted">—</span>
                      }
                    </td>
                    <td>
                      <span className="text-xs text-slate-300 bg-white/5 px-2 py-1 rounded border border-white/5">{r.method}</span>
                    </td>
                    <td className="text-xs text-muted font-mono">{r.reference || '—'}</td>
                    <td>
                      <span className={`badge ${STATUS_STYLES[r.status]} gap-1`}>
                        {STATUS_ICONS[r.status]} {r.status}
                      </span>
                    </td>
                    <td className="text-right tabular-nums font-bold text-success">
                      +{formatCurrency(r.amount)}
                    </td>
                  </tr>
                ))
              }
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center text-muted py-16">
                  <Banknote size={40} className="mx-auto mb-3 opacity-20"/>
                  <p>No receipts yet. Record your first payment!</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

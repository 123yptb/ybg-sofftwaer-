'use client';
import { useEffect, useState } from 'react';
import { useBusinessType } from '@/lib/context/BusinessContext';
import {
  getInvoices, createInvoice, updateInvoice, updateInvoiceStatus,
  getCustomers, deleteInvoice,
} from '@/lib/actions/invoicesReceipts';
import { getGlobalInventory } from '@/lib/actions/inventory';
import { formatCurrency, formatDate, INVOICE_STATUS_STYLES } from '@/lib/utils';
import { Plus, Search, Eye, X, Trash2, FileText, Pencil } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const STATUSES = ['All', 'Draft', 'Sent', 'Paid', 'Overdue', 'Void'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'UPI'];

// ── Shared line row ───────────────────────────────────────────────────────────
function LineRow({ line, index, onChange, onRemove, canRemove }) {
  return (
    <div className="p-3 rounded-lg bg-white/5 border border-border space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted uppercase">Line {index + 1}</p>
        {canRemove && <button onClick={() => onRemove(index)} className="btn-icon text-danger/60 hover:text-danger"><Trash2 size={13}/></button>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="input-group">
          <label className="input-label">Item</label>
          <select 
            className="input" 
            value={line.productId || ''} 
            onChange={e => {
              const val = e.target.value;
              onChange(index, 'productId', val);
              const p = line.products?.find(f => f.id === val);
              if (p) {
                if (!line.description) onChange(index, 'description', p.name);
                if (!line.unitPrice) onChange(index, 'unitPrice', p.salePrice || p.unitPrice || 0);
              }
            }}
          >
            <option value="">— Custom Item —</option>
            {line.products?.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} {p.type === 'RAW_MATERIAL' ? '(RM)' : '(FG)'} — {p.stockQuantity} in stock
              </option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">Description</label>
          <input className="input" value={line.description} onChange={e => onChange(index, 'description', e.target.value)} placeholder="Item description"/>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="input-group">
          <label className="input-label">Qty</label>
          <input className="input" type="number" min="1" value={line.quantity} onChange={e => onChange(index, 'quantity', e.target.value)}/>
        </div>
        <div className="input-group">
          <label className="input-label">Unit Price (₹)</label>
          <input className="input" type="number" min="0" step="0.01" value={line.unitPrice} onChange={e => onChange(index, 'unitPrice', e.target.value)} placeholder="0.00"/>
        </div>
        <div className="input-group">
          <label className="input-label">GST %</label>
          <input className="input" type="number" min="0" max="100" value={line.taxRate} onChange={e => onChange(index, 'taxRate', e.target.value)}/>
        </div>
      </div>
      <p className="text-right text-sm font-semibold text-white tabular-nums">
        Amount: {formatCurrency((parseFloat(line.quantity)||1) * (parseFloat(line.unitPrice)||0))}
      </p>
    </div>
  );
}

// ── Create Invoice Modal ──────────────────────────────────────────────────────
function InvoiceModal({ customers, products, onClose, onSaved }) {
  const { invoiceItems: itemsLabel } = useBusinessType();
  const defaultDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [form, setForm]     = useState({ customerId: '', dueDate: defaultDueDate, notes: '' });
  const [lines, setLines]   = useState([{ description: '', quantity: 1, unitPrice: '', taxRate: 0, productId: '' }]);
  const [saving, setSaving] = useState(false);

  const addLine    = () => setLines(l => [...l, { description: '', quantity: 1, unitPrice: '', taxRate: 0, productId: '' }]);
  const removeLine = i => setLines(l => l.filter((_, idx) => idx !== i));
  const updateLine = (i, key, val) => setLines(l => {
    const newLines = l.map((line, idx) => idx === i ? { ...line, [key]: val } : line);
    if (i === l.length - 1 && (key === 'productId' || key === 'description') && val) {
      newLines.push({ description: '', quantity: 1, unitPrice: '', taxRate: 0, productId: '' });
    }
    return newLines;
  });

  const subtotal = lines.reduce((s, l) => s + (parseFloat(l.quantity)||1) * (parseFloat(l.unitPrice)||0), 0);
  const tax      = lines.reduce((s, l) => s + (parseFloat(l.quantity)||1) * (parseFloat(l.unitPrice)||0) * ((parseFloat(l.taxRate)||0)/100), 0);

  const handleSubmit = async () => {
    if (!form.customerId) return toast.error('Please select a customer');
    setSaving(true);
    const res = await createInvoice({ ...form, lineItems: lines });
    setSaving(false);
    if (res.success) { toast.success(`Invoice ${res.data.invoiceNumber} created!`); onClose(); onSaved(); }
    else toast.error(res.error);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card w-full max-w-xl p-0 overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div><h2 className="font-bold text-white text-lg">New Invoice</h2><p className="text-xs text-muted">Create a sales invoice</p></div>
          <button onClick={onClose} className="btn-icon"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">Customer *</label>
              <div className="flex gap-2">
                <select id="invoice-customer-select" value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))} className="input flex-1">
                  <option value="">— Select customer —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Link href="/customers?from=invoice" onClick={onClose} className="btn-secondary px-3 shrink-0 flex items-center gap-1.5 text-xs" title="New customer">
                  <Plus size={13}/> New
                </Link>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Due Date *</label>
              <input id="invoice-due-date" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="input"/>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">{itemsLabel}</p>
              <button onClick={addLine} className="btn-ghost text-xs gap-1"><Plus size={13}/> Add Line</button>
            </div>
            <div className="space-y-3">
              {lines.map((line, i) => <LineRow key={i} index={i} line={{...line, products}} onChange={updateLine} onRemove={removeLine} canRemove={lines.length > 1}/>)}
            </div>
            <div className="mt-4 pt-4 border-t border-border space-y-1 text-sm text-right">
              <p className="text-muted">Subtotal: <span className="text-slate-300 tabular-nums">{formatCurrency(subtotal)}</span></p>
              <p className="text-muted">GST: <span className="text-slate-300 tabular-nums">{formatCurrency(tax)}</span></p>
              <p className="font-bold text-white text-base">Total: <span className="tabular-nums">{formatCurrency(subtotal + tax)}</span></p>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Notes</label>
            <textarea id="invoice-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input resize-none" rows={2} placeholder="Payment terms, remarks…"/>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button id="invoice-submit-btn" onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? 'Creating…' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditInvoiceModal({ invoice, customers, products, onClose, onSaved }) {
  const { invoiceItems: itemsLabel } = useBusinessType();
  const [customerId, setCustomerId] = useState(invoice.customerId);
  const [dueDate, setDueDate]       = useState(invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0,10) : '');
  const [notes, setNotes]           = useState(invoice.notes || '');
  const [status, setStatus]         = useState(invoice.status);
  const [lines, setLines]           = useState(
    invoice.lineItems?.length
      ? invoice.lineItems.map(l => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, taxRate: l.taxRate || 0, productId: l.productId || '' }))
      : [{ description: '', quantity: 1, unitPrice: '', taxRate: 0, productId: '' }]
  );
  const [saving, setSaving] = useState(false);

  const addLine    = () => setLines(l => [...l, { description: '', quantity: 1, unitPrice: '', taxRate: 0, productId: '' }]);
  const removeLine = i => setLines(l => l.filter((_, idx) => idx !== i));
  const updateLine = (i, key, val) => setLines(l => {
    const newLines = l.map((line, idx) => idx === i ? { ...line, [key]: val } : line);
    if (i === l.length - 1 && (key === 'productId' || key === 'description') && val) {
      newLines.push({ description: '', quantity: 1, unitPrice: '', taxRate: 0, productId: '' });
    }
    return newLines;
  });

  const subtotal = lines.reduce((s, l) => s + (parseFloat(l.quantity)||1) * (parseFloat(l.unitPrice)||0), 0);
  const tax      = lines.reduce((s, l) => s + (parseFloat(l.quantity)||1) * (parseFloat(l.unitPrice)||0) * ((parseFloat(l.taxRate)||0)/100), 0);

  const handleSubmit = async () => {
    if (!customerId) return toast.error('Please select a customer');
    setSaving(true);
    const res = await updateInvoice(invoice.id, { customerId, dueDate, notes, status, lineItems: lines });
    setSaving(false);
    if (res.success) { toast.success(`${invoice.invoiceNumber} updated!`); onClose(); onSaved(); }
    else toast.error(res.error);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card w-full max-w-xl p-0 overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div>
            <h2 className="font-bold text-white text-lg">Edit Invoice</h2>
            <p className="text-xs font-mono text-primary-light">{invoice.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">Customer *</label>
              <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="input">
                <option value="">— Select customer —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="input">
                {['Draft','Sent','Paid','Overdue','Void'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input"/>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">{itemsLabel}</p>
              <button onClick={addLine} className="btn-ghost text-xs gap-1"><Plus size={13}/> Add Line</button>
            </div>
            <div className="space-y-3">
              {lines.map((line, i) => <LineRow key={i} index={i} line={{...line, products}} onChange={updateLine} onRemove={removeLine} canRemove={lines.length > 1}/>)}
            </div>
            <div className="mt-4 pt-4 border-t border-border space-y-1 text-sm text-right">
              <p className="text-muted">Subtotal: <span className="text-slate-300 tabular-nums">{formatCurrency(subtotal)}</span></p>
              <p className="text-muted">GST: <span className="text-slate-300 tabular-nums">{formatCurrency(tax)}</span></p>
              <p className="font-bold text-white text-base">Total: <span className="tabular-nums">{formatCurrency(subtotal + tax)}</span></p>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input resize-none" rows={2}/>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const [invoices,      setInvoices]      = useState([]);
  const [customers,     setCustomers]     = useState([]);
  const [products,      setProducts]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [statusFilter,  setStatus]        = useState('All');
  const [search,        setSearch]        = useState('');
  const [showCreate,    setShowCreate]    = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const load = async () => {
    setLoading(true);
    const [invRes, custRes, fgRes] = await Promise.all([getInvoices(), getCustomers(), getGlobalInventory()]);
    if (invRes.success)  setInvoices(invRes.data);
    if (custRes.success) setCustomers(custRes.data);
    if (fgRes.success)   setProducts(fgRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = invoices.filter(inv => {
    const matchStatus = statusFilter === 'All' || inv.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || inv.invoiceNumber.toLowerCase().includes(q) || inv.customer?.name.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const markStatus = async (id, status) => {
    const res = await updateInvoiceStatus(id, status);
    if (res.success) { toast.success(`Marked as ${status}`); load(); }
    else toast.error(res.error);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;
    const res = await deleteInvoice(id);
    if (res.success) { toast.success('Invoice deleted successfully'); load(); }
    else toast.error(res.error || 'Failed to delete invoice');
  };

  return (
    <div>
      {showCreate && <InvoiceModal customers={customers} products={products} onClose={() => setShowCreate(false)} onSaved={load}/>}
      {editingInvoice && <EditInvoiceModal invoice={editingInvoice} customers={customers} products={products} onClose={() => setEditingInvoice(null)} onSaved={load}/>}

      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Manage your accounts receivable</p>
        </div>
        <button id="new-invoice-btn" onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16}/> New Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
          <input id="invoice-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices…" className="input pl-9"/>
        </div>
        <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === s ? 'bg-gradient-primary text-white shadow-glow-sm' : 'text-muted hover:text-white'}`}>
              {s}
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
                <th>Invoice #</th><th>Customer</th><th>Issue Date</th>
                <th>Due Date</th><th>Status</th>
                <th className="text-right">Total</th><th className="text-right">Amount Due</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(6)].map((_,i) => <tr key={i}>{[...Array(8)].map((_,j) => <td key={j}><div className="h-4 bg-white/5 rounded animate-pulse"/></td>)}</tr>)
                : filtered.map(inv => (
                  <tr key={inv.id}>
                    <td className="font-mono text-primary-light text-xs font-semibold">{inv.invoiceNumber}</td>
                    <td className="font-medium text-slate-200">{inv.customer?.name}</td>
                    <td className="text-muted text-xs">{formatDate(inv.issueDate)}</td>
                    <td className="text-muted text-xs">{formatDate(inv.dueDate)}</td>
                    <td><span className={`badge ${INVOICE_STATUS_STYLES[inv.status]}`}>{inv.status}</span></td>
                    <td className="text-right tabular-nums font-medium">{formatCurrency(inv.totalAmount)}</td>
                    <td className="text-right tabular-nums font-semibold text-warning">{formatCurrency(inv.amountDue)}</td>
                    <td>
                      <div className="flex items-center gap-1 justify-end">
                        {inv.status === 'Draft' && (
                          <button onClick={() => markStatus(inv.id, 'Sent')} className="btn-ghost text-primary-light hover:bg-primary/10 text-xs px-2">Send</button>
                        )}
                        {inv.status === 'Sent' && (
                          <button onClick={() => markStatus(inv.id, 'Paid')} className="btn-ghost text-success hover:bg-success/10 text-xs px-2">Mark Paid</button>
                        )}
                        <button
                          onClick={() => setEditingInvoice(inv)}
                          className="btn-icon text-muted hover:text-primary-light"
                          title="Edit invoice"
                        >
                          <Pencil size={14}/>
                        </button>
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="btn-icon text-muted hover:text-danger"
                          title="Delete invoice"
                        >
                          <Trash2 size={14}/>
                        </button>
                        <Link href={`/invoices/${inv.id}`} className="btn-icon"><Eye size={14}/></Link>
                      </div>
                    </td>
                  </tr>
                ))
              }
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center text-muted py-16">
                  <FileText size={40} className="mx-auto mb-3 opacity-20"/>
                  <p>No invoices found. Create your first one!</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

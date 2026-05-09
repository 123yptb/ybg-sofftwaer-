'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCustomers, createCustomer } from '@/lib/actions/invoicesReceipts';
import { formatDate } from '@/lib/utils';
import { Plus, X, Users, Search, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

function CustomerModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', gstin: '' });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Customer name is required'); return; }
    setSaving(true);
    const res = await createCustomer(form);
    setSaving(false);
    if (res.success) {
      toast.success(`Customer "${res.data.name}" created!`);
      onSaved(res.data);
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card w-full max-w-md p-0 overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div>
            <h2 className="font-bold text-white text-lg">New Customer</h2>
            <p className="text-xs text-muted mt-0.5">Add a customer to your organization</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18}/></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="input-group">
            <label className="input-label">Customer Name *</label>
            <input id="customer-name" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Acme Corporation" className="input" autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">Email</label>
              <input id="customer-email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="contact@email.com" className="input" type="email"/>
            </div>
            <div className="input-group">
              <label className="input-label">Phone</label>
              <input id="customer-phone" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+91 99999 99999" className="input"/>
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Address</label>
            <textarea id="customer-address" value={form.address} onChange={e => set('address', e.target.value)}
              placeholder="Street, City, State, PIN" className="input resize-none" rows={2}/>
          </div>
          <div className="input-group">
            <label className="input-label">GSTIN</label>
            <input id="customer-gstin" value={form.gstin} onChange={e => set('gstin', e.target.value)}
              placeholder="e.g. 27AAPFU0939F1ZV" className="input font-mono"/>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button id="customer-submit-btn" onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Create Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromInvoice = searchParams.get('from') === 'invoice';

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await getCustomers();
    if (res.success) setCustomers(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
      || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaved = (newCustomer) => {
    setShowCreate(false);
    load();
    // If came from invoice page, go back after customer is created
    if (fromInvoice) {
      setTimeout(() => router.push('/invoices'), 800);
    }
  };

  return (
    <div>
      {showCreate && (
        <CustomerModal
          onClose={() => setShowCreate(false)}
          onSaved={handleSaved}
        />
      )}

      <div className="page-header">
        <div className="flex items-center gap-3">
          {fromInvoice && (
            <button onClick={() => router.push('/invoices')} className="btn-icon">
              <ArrowLeft size={16}/>
            </button>
          )}
          <div>
            <h1 className="page-title">Customers</h1>
            <p className="page-subtitle">
              {fromInvoice
                ? 'Create a customer, then you\'ll be returned to the invoice'
                : 'Manage your customer directory'}
            </p>
          </div>
        </div>
        <button id="new-customer-btn" onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16}/> New Customer
        </button>
      </div>

      {/* Info banner when coming from invoice */}
      {fromInvoice && (
        <div className="mb-6 p-4 rounded-xl border border-primary/30 bg-primary/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <ArrowLeft size={14} className="text-primary-light"/>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Coming from Invoice Creation</p>
            <p className="text-xs text-muted">Create a customer below, then you'll be automatically returned to create your invoice.</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
        <input id="customer-search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search customers…" className="input pl-9"/>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <p className="text-2xl font-bold text-white">{customers.length}</p>
          <p className="text-sm text-muted mt-1">Total Customers</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-success/20 to-success/5 border-success/30">
          <p className="text-2xl font-bold text-white">{customers.filter(c => c.email).length}</p>
          <p className="text-sm text-muted mt-1">With Email</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-warning/20 to-warning/5 border-warning/30">
          <p className="text-2xl font-bold text-white">{customers.filter(c => c.gstin).length}</p>
          <p className="text-sm text-muted mt-1">GST Registered</p>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>GSTIN</th>
                <th>Added</th>
                {fromInvoice && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(4)].map((_,i) => (
                    <tr key={i}>{[...Array(5)].map((_,j) => (
                      <td key={j}><div className="h-4 bg-white/5 rounded animate-pulse"/></td>
                    ))}</tr>
                  ))
                : filtered.map(c => (
                  <tr key={c.id}>
                    <td className="font-semibold text-slate-200">{c.name}</td>
                    <td className="text-muted text-sm">{c.email || '—'}</td>
                    <td className="text-muted text-sm">{c.phone || '—'}</td>
                    <td className="font-mono text-xs text-muted">{c.gstin || '—'}</td>
                    <td className="text-xs text-muted">{formatDate(c.createdAt)}</td>
                    {fromInvoice && (
                      <td>
                        <button
                          onClick={() => router.push('/invoices')}
                          className="btn-ghost text-xs text-primary-light hover:bg-primary/10">
                          Use in Invoice →
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              }
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={fromInvoice ? 6 : 5} className="text-center text-muted py-16">
                  <Users size={40} className="mx-auto mb-3 opacity-20"/>
                  <p className="mb-3">No customers yet</p>
                  <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">
                    <Plus size={14}/> Add First Customer
                  </button>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

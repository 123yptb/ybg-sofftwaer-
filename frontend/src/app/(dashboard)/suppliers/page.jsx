'use client';
import { useEffect, useState } from 'react';
import { getSuppliers, createSupplier, updateSupplier } from '@/lib/actions/manufacturing';
import { getInitials } from '@/lib/utils';
import { Plus, Search, Truck, Mail, Phone, X, Loader2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

function SupplierModal({ supplier, onClose, onSaved }) {
  const editing = Boolean(supplier?.id);
  const [form, setForm] = useState({
    name:         supplier?.name         || '',
    email:        supplier?.email        || '',
    phone:        supplier?.phone        || '',
    gstin:        supplier?.gstin        || '',
    address:      supplier?.address      || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    let res;
    if (editing) {
      res = await updateSupplier(supplier.id, form);
    } else {
      res = await createSupplier(form);
    }
    
    setSaving(false);
    if (res.success) {
      toast.success(editing ? 'Supplier updated' : 'Supplier created');
      onSaved();
      onClose();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">{editing ? 'Edit Supplier' : 'New Supplier'}</h2>
            <p className="text-xs text-muted mt-0.5">Vendor / purchasing contact</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={16}/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="input-group sm:col-span-2">
              <label className="input-label">Supplier Name <span className="text-danger">*</span></label>
              <input required value={form.name} onChange={set('name')}
                placeholder="e.g. Acme Corp" className="input"/>
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input type="email" value={form.email} onChange={set('email')}
                placeholder="vendor@company.com" className="input"/>
            </div>
            <div className="input-group">
              <label className="input-label">Phone</label>
              <input value={form.phone} onChange={set('phone')}
                placeholder="+1 555 000 0000" className="input"/>
            </div>
            <div className="input-group">
              <label className="input-label">GSTIN</label>
              <input value={form.gstin} onChange={set('gstin')}
                placeholder="GSTIN Number" className="input font-mono"/>
            </div>
            <div className="input-group sm:col-span-2">
              <label className="input-label">Address</label>
              <textarea value={form.address} onChange={set('address')} rows={3}
                placeholder="Full address…" className="input resize-none"/>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <Loader2 size={14} className="animate-spin"/> : null}
              {editing ? 'Save Changes' : 'Create Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [modal,     setModal]     = useState(null); // null | {} | supplier obj

  const fetchSuppliers = async () => {
    setLoading(true);
    const res = await getSuppliers();
    if (res.success) {
      setSuppliers(res.data);
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const filtered = suppliers.filter(s =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {modal !== null && (
        <SupplierModal
          supplier={modal}
          onClose={() => setModal(null)}
          onSaved={fetchSuppliers}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">Manage your vendors and purchasing contacts</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({})}>
          <Plus size={16}/> Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search suppliers…" className="input pl-9"/>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_,i) => (
            <div key={i} className="card p-5 h-36 animate-pulse bg-white/5"/>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center text-muted">
          <Truck size={40} className="mx-auto mb-3 opacity-20"/>
          <p className="font-medium">No suppliers found</p>
          <p className="text-xs mt-1">Add your first supplier to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div key={s.id} className="card-hover p-5 flex flex-col gap-4 group">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary-light font-bold text-sm">
                  {getInitials(s.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{s.name}</p>
                </div>
                <button
                  onClick={() => setModal(s)}
                  className="opacity-0 group-hover:opacity-100 btn-icon w-7 h-7 transition-opacity"
                  title="Edit supplier">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>

              {/* Contact */}
              <div className="space-y-1.5">
                {s.email && (
                  <a href={`mailto:${s.email}`} className="flex items-center gap-2 text-xs text-muted hover:text-primary-light transition-colors truncate">
                    <Mail size={12}/> {s.email}
                  </a>
                )}
                {s.phone && (
                  <a href={`tel:${s.phone}`} className="flex items-center gap-2 text-xs text-muted hover:text-primary-light transition-colors">
                    <Phone size={12}/> {s.phone}
                  </a>
                )}
              </div>

              {/* Status */}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <span className="badge badge-success">
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { getRawMaterials, createRawMaterial, deleteRawMaterial } from '@/lib/actions/manufacturing';
import { Plus, X, Package, AlertTriangle, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

function AddMaterialModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', sku: '', unit: 'kg', costPrice: '', stockQuantity: '', minStockLevel: '5' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    const res = await createRawMaterial(form);
    setSaving(false);
    if (res.success) { toast.success(`${res.data.name} added!`); onSaved(); onClose(); }
    else toast.error(res.error);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card w-full max-w-md p-0 overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div>
            <h2 className="font-bold text-white text-lg">Add Raw Material</h2>
            <p className="text-xs text-muted mt-0.5">Add to your raw material inventory</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="input-group">
            <label className="input-label">Material Name *</label>
            <input id="rm-name" value={form.name} onChange={e => set('name', e.target.value)} autoFocus
              placeholder="e.g. Steel Sheets" className="input" onKeyDown={e => e.key==='Enter' && handleSubmit()}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">SKU / Code</label>
              <input value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="RM-001" className="input"/>
            </div>
            <div className="input-group">
              <label className="input-label">Unit</label>
              <select value={form.unit} onChange={e => set('unit', e.target.value)} className="input">
                {['kg','g','ton','L','mL','pcs','m','cm','sq.m','box','roll'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Cost / Unit (₹)</label>
              <input type="number" value={form.costPrice} onChange={e => set('costPrice', e.target.value)} placeholder="0.00" className="input"/>
            </div>
            <div className="input-group">
              <label className="input-label">Opening Stock</label>
              <input type="number" value={form.stockQuantity} onChange={e => set('stockQuantity', e.target.value)} placeholder="0" className="input"/>
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Minimum Stock Level</label>
            <input type="number" value={form.minStockLevel} onChange={e => set('minStockLevel', e.target.value)} className="input"/>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button id="rm-submit" onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Add Material'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RawMaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await getRawMaterials();
    if (res.success) setMaterials(res.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const totalValue = materials.reduce((s, m) => s + m.stockQuantity * m.costPrice, 0);
  const lowStock   = materials.filter(m => m.stockQuantity <= m.minStockLevel);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this raw material?')) return;
    const res = await deleteRawMaterial(id);
    if (res.success) {
      toast.success('Raw material deleted successfully');
      load();
    } else {
      toast.error(res.error || 'Failed to delete material');
    }
  };

  return (
    <div>
      {showAdd && <AddMaterialModal onClose={() => setShowAdd(false)} onSaved={load}/>}

      <div className="page-header">
        <div>
          <h1 className="page-title">Raw Materials</h1>
          <p className="page-subtitle">Manage your raw material inventory</p>
        </div>
        <button id="add-rm-btn" onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={16}/> Add Material
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5 bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-orange-500/30">
          <p className="text-2xl font-bold text-white">{materials.length}</p>
          <p className="text-sm text-muted mt-1">Total Materials</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <p className="text-2xl font-bold text-white">{formatCurrency(totalValue)}</p>
          <p className="text-sm text-muted mt-1">Total Stock Value</p>
        </div>
        <div className={`card p-5 bg-gradient-to-br border ${lowStock.length > 0 ? 'from-danger/20 to-danger/5 border-danger/30' : 'from-success/20 to-success/5 border-success/30'}`}>
          <p className="text-2xl font-bold text-white">{lowStock.length}</p>
          <p className="text-sm text-muted mt-1">Low Stock Alerts</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Material</th>
              <th>SKU</th>
              <th>Unit</th>
              <th>Cost / Unit</th>
              <th>Stock</th>
              <th>Min Stock</th>
              <th>Stock Value</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(4)].map((_,i) => <tr key={i}>{[...Array(8)].map((_,j) => <td key={j}><div className="h-4 bg-white/5 rounded animate-pulse"/></td>)}</tr>)
              : materials.map(m => (
                <tr key={m.id}>
                  <td className="font-semibold text-slate-200">{m.name}</td>
                  <td className="font-mono text-xs text-muted">{m.sku || '—'}</td>
                  <td className="text-muted">{m.unit}</td>
                  <td className="tabular-nums">{formatCurrency(m.costPrice)}</td>
                  <td className="tabular-nums font-mono">{m.stockQuantity} {m.unit}</td>
                  <td className="text-muted tabular-nums">{m.minStockLevel} {m.unit}</td>
                  <td className="tabular-nums">{formatCurrency(m.stockQuantity * m.costPrice)}</td>
                  <td>
                    {m.stockQuantity <= m.minStockLevel
                      ? <span className="badge badge-danger flex items-center gap-1"><AlertTriangle size={10}/> Low</span>
                      : <span className="badge badge-success">OK</span>}
                  </td>
                  <td>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="btn-icon text-muted hover:text-danger"
                      title="Delete material"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </td>
                </tr>
              ))
            }
            {!loading && materials.length === 0 && (
              <tr><td colSpan={8} className="text-center py-16 text-muted">
                <Package size={40} className="mx-auto mb-3 opacity-20"/>
                <p className="mb-3">No raw materials yet</p>
                <button onClick={() => setShowAdd(true)} className="btn-primary mx-auto"><Plus size={14}/> Add First Material</button>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

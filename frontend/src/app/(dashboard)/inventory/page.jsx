'use client';

import { useState, useEffect } from 'react';
import { getGlobalInventory, createProduct, updateProduct, deleteProduct } from '@/lib/actions/inventory';
import { Plus, Search, PackageOpen, Boxes, X, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

// ── Product Form Modal (Add / Edit) ───────────────────────────────────────────
function ProductModal({ onClose, onSaved, editItem = null }) {
  const isEdit = !!editItem;
  const [form, setForm] = useState({
    name: editItem?.name || '',
    type: editItem?.type || 'FINISHED_GOOD',
    unit: editItem?.unit || 'pcs',
    sku: editItem?.sku || '',
    purchasePrice: editItem?.purchasePrice ?? '',
    salePrice: editItem?.salePrice ?? '',
    stockQuantity: editItem?.stockQuantity ?? '',
    minStockLevel: editItem?.minStockLevel ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [skuAuto, setSkuAuto] = useState('');

  // Auto-generate SKU (only for new items)
  useEffect(() => {
    if (!isEdit && form.name && !form.sku) {
      const prefix = form.type === 'RAW_MATERIAL' ? 'RM' : 'FG';
      const shortName = form.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
      setSkuAuto(`${prefix}-${shortName}-${Math.floor(1000 + Math.random() * 9000)}`);
    }
  }, [form.name, form.type, isEdit]);

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('Product name is required');
    const finalForm = { ...form, sku: form.sku || skuAuto };
    setSaving(true);
    const res = isEdit
      ? await updateProduct(editItem.id, finalForm)
      : await createProduct(finalForm);
    setSaving(false);
    if (res.success) {
      toast.success(isEdit ? 'Item updated!' : 'Item added!');
      onSaved();
      onClose();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1a2235] border border-slate-700/50 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
          <h2 className="text-lg font-bold text-white">{isEdit ? 'Edit Item' : 'Add New Item'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-slate-400 transition-colors"><X size={20}/></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Type Toggle */}
          <div className="flex gap-4 mb-2">
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${form.type === 'RAW_MATERIAL' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'}`}
              onClick={() => setForm(f => ({ ...f, type: 'RAW_MATERIAL' }))}>
              Raw Material
            </button>
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${form.type === 'FINISHED_GOOD' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'}`}
              onClick={() => setForm(f => ({ ...f, type: 'FINISHED_GOOD' }))}>
              Finished Good
            </button>
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
              placeholder="Item name"/>
          </div>

          {/* SKU + Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">SKU</label>
              <input value={form.sku} onChange={e => setForm(f => ({...f, sku: e.target.value}))}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all font-mono"
                placeholder={skuAuto || 'Auto-generated'}/>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Unit</label>
              <select value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 appearance-none transition-all">
                {['pcs', 'kg', 'g', 'L', 'm', 'box'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Purchase Price (Cost)</label>
              <input type="number" value={form.purchasePrice} onChange={e => setForm(f => ({...f, purchasePrice: e.target.value}))}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all" placeholder="0.00"/>
            </div>
            {form.type === 'FINISHED_GOOD' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Sale Price</label>
                <input type="number" value={form.salePrice} onChange={e => setForm(f => ({...f, salePrice: e.target.value}))}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all" placeholder="0.00"/>
              </div>
            )}
          </div>

          {/* Stock (only for new items) */}
          {!isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Initial Stock</label>
                <input type="number" value={form.stockQuantity} onChange={e => setForm(f => ({...f, stockQuantity: e.target.value}))}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all" placeholder="0"/>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Min Stock Alert</label>
                <input type="number" value={form.minStockLevel} onChange={e => setForm(f => ({...f, minStockLevel: e.target.value}))}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all" placeholder="0"/>
              </div>
            </div>
          )}
          {isEdit && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Min Stock Alert</label>
              <input type="number" value={form.minStockLevel} onChange={e => setForm(f => ({...f, minStockLevel: e.target.value}))}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all" placeholder="0"/>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-slate-700/50 flex justify-end gap-3 bg-slate-800/30">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50">
            {saving ? 'Saving...' : isEdit ? 'Update Item' : 'Save Item'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────
function DeleteModal({ item, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const res = await deleteProduct(item.id);
    setDeleting(false);
    if (res.success) {
      toast.success(`"${item.name}" deleted.`);
      onDeleted();
      onClose();
    } else {
      toast.error(res.error || 'Cannot delete — item may be linked to invoices or production orders.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1a2235] border border-red-900/50 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-red-400"/>
          </div>
          <h2 className="text-lg font-bold text-white mb-1">Delete Item?</h2>
          <p className="text-slate-400 text-sm">
            You are about to delete <span className="text-white font-semibold">"{item.name}"</span>. This action cannot be undone.
          </p>
        </div>
        <div className="p-4 border-t border-slate-700/50 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50">
            {deleting ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function GlobalInventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const res = await getGlobalInventory();
    if (res.success) setProducts(res.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = products.filter(p => {
    if (filter !== 'ALL' && p.type !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalValue = filtered.reduce((s, p) => s + (p.stockQuantity * p.purchasePrice), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Modals */}
      {showModal && <ProductModal onClose={() => setShowModal(false)} onSaved={loadData} />}
      {editItem && <ProductModal editItem={editItem} onClose={() => setEditItem(null)} onSaved={loadData} />}
      {deleteItem && <DeleteModal item={deleteItem} onClose={() => setDeleteItem(null)} onDeleted={loadData} />}

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Global Inventory</h1>
          <p className="text-slate-400 mt-1">Unified view of Raw Materials and Finished Goods.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all">
          <Plus size={18} /> Add Item
        </button>
      </div>

      {/* KPI & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="col-span-1 md:col-span-3 flex items-center gap-3 bg-[#131b2f] border border-slate-800 rounded-2xl p-2 shadow-inner">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent border-none text-white pl-11 pr-4 py-2 focus:outline-none placeholder-slate-500"
              placeholder="Search by name or SKU..."/>
          </div>
          <div className="w-px h-8 bg-slate-800 mx-2"></div>
          <div className="flex gap-1 pr-2">
            {['ALL', 'RAW_MATERIAL', 'FINISHED_GOOD'].map(f => (
              <button
                key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${filter === f ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl p-4 flex flex-col justify-center backdrop-blur-md">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Total Valuation</p>
          <p className="text-2xl font-bold text-white tracking-tight">{formatCurrency(totalValue)}</p>
        </div>
      </div>

      {/* Data Grid */}
      <div className="bg-[#131b2f]/80 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-800">
                <th className="px-6 py-4">Item Details</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">In Stock</th>
                <th className="px-6 py-4 text-right">Avg Cost</th>
                <th className="px-6 py-4 text-right">Value</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-5 w-48 bg-slate-800 rounded"></div></td>
                    <td className="px-6 py-5"><div className="h-5 w-24 bg-slate-800 rounded"></div></td>
                    <td className="px-6 py-5"><div className="h-5 w-16 bg-slate-800 rounded ml-auto"></div></td>
                    <td className="px-6 py-5"><div className="h-5 w-20 bg-slate-800 rounded ml-auto"></div></td>
                    <td className="px-6 py-5"><div className="h-5 w-24 bg-slate-800 rounded ml-auto"></div></td>
                    <td className="px-6 py-5"><div className="h-5 w-16 bg-slate-800 rounded mx-auto"></div></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <PackageOpen size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium text-slate-400">No items found</p>
                    <p className="text-sm mt-1">Try adjusting your search or filter.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-200 group-hover:text-white transition-colors">{p.name}</span>
                        {p.sku && <span className="text-xs text-slate-500 font-mono mt-0.5">{p.sku}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {p.type === 'RAW_MATERIAL' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Boxes size={12}/> RAW
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <PackageOpen size={12}/> FG
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`font-semibold ${p.stockQuantity <= p.minStockLevel ? 'text-red-400' : 'text-slate-300'}`}>
                          {p.stockQuantity} <span className="text-xs font-normal text-slate-500">{p.unit}</span>
                        </span>
                        {p.stockQuantity <= p.minStockLevel && <span className="text-[10px] text-red-400 mt-0.5">Low Stock</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400 font-medium tabular-nums">{formatCurrency(p.purchasePrice)}</td>
                    <td className="px-6 py-4 text-right text-slate-300 font-semibold tabular-nums tracking-wide">{formatCurrency(p.stockQuantity * p.purchasePrice)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditItem(p)}
                          title="Edit"
                          className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 transition-all">
                          <Pencil size={14}/>
                        </button>
                        <button
                          onClick={() => setDeleteItem(p)}
                          title="Delete"
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition-all">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

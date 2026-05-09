'use client';
import { useEffect, useState } from 'react';
import { getProductionOrders, createProductionOrder, completeProductionOrder, getRawMaterials, getBOMs } from '@/lib/actions/manufacturing';
import { Plus, X, Factory, CheckCircle2, Clock, Play, Trash2 } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  Planned:    'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  InProgress: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  Completed:  'bg-green-500/20 text-green-300 border border-green-500/30',
  Cancelled:  'bg-red-500/20 text-red-300 border border-red-500/30',
};

function CreateOrderModal({ rawMaterials, boms = [], onClose, onSaved }) {
  const [form, setForm]   = useState({ finishedGoodName: '', finishedGoodSku: '', finishedGoodUnit: 'pcs', quantityToProduce: 1, startDate: new Date().toISOString().slice(0,10), notes: '', laborCost: '', overheadCost: '' });
  const [mats, setMats]   = useState([{ rawMaterialId: '', quantityNeeded: '' }]);
  const [saving, setSaving] = useState(false);
  const [customSku, setCustomSku] = useState(false);
  const [selectedBom, setSelectedBom] = useState(null);
  
  const set = (k, v) => {
    setForm(f => {
      const newForm = { ...f, [k]: v };
      // If updating quantity, automatically recalculate raw materials if a BOM is selected
      if (k === 'quantityToProduce' && selectedBom) {
        setMats(selectedBom.materials.map(m => ({
          rawMaterialId: m.rawMaterialId,
          quantityNeeded: m.quantity * (parseFloat(v) || 1)
        })));
      }
      return newForm;
    });
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm(f => {
      let newSku = f.finishedGoodSku;
      if (!customSku && name.trim()) {
        const words = name.trim().split(/\s+/);
        let prefix = words.length === 1 ? words[0].substring(0, 3) : words.map(w => w[0]).join('');
        newSku = `${prefix.toUpperCase().substring(0, 3)}-001`;
      } else if (!customSku && !name.trim()) {
        newSku = '';
      }
      return { ...f, finishedGoodName: name, finishedGoodSku: newSku };
    });
  };

  const addMat    = () => setMats(m => [...m, { rawMaterialId: '', quantityNeeded: '' }]);
  const removeMat = i => setMats(m => m.filter((_, idx) => idx !== i));
  const updateMat = (i, k, v) => setMats(m => m.map((x, idx) => idx === i ? { ...x, [k]: v } : x));

  const handleSubmit = async () => {
    if (!form.finishedGoodName.trim()) return toast.error('Finished good name is required');
    if (!form.quantityToProduce) return toast.error('Quantity is required');
    setSaving(true);
    const res = await createProductionOrder({ ...form, materials: mats.filter(m => m.rawMaterialId && m.quantityNeeded) });
    setSaving(false);
    if (res.success) { toast.success(`Production order ${res.data.orderNumber} created!`); onSaved(); onClose(); }
    else toast.error(res.error);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card w-full max-w-2xl p-0 overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div>
            <h2 className="font-bold text-white text-lg">New Production Order</h2>
            <p className="text-xs text-muted mt-0.5">Plan a manufacturing run</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {boms.length > 0 && (
            <div className="input-group bg-primary/5 p-4 rounded-xl border border-primary/20">
              <label className="input-label text-primary">Load from Bill of Materials (Optional)</label>
              <select id="po-bom-select" className="input border-primary/30 focus:border-primary" onChange={(e) => {
                const bom = boms.find(b => b.id === e.target.value);
                setSelectedBom(bom || null);
                if (bom) {
                  setCustomSku(true);
                  setForm(f => ({
                    ...f,
                    finishedGoodName: bom.finishedGood?.name || bom.name,
                    finishedGoodSku:  bom.finishedGood?.sku || '',
                    finishedGoodUnit: bom.finishedGood?.unit || 'pcs',
                    laborCost:        bom.laborCost || '',
                    overheadCost:     bom.overheadCost || '',
                  }));
                  setMats(bom.materials.map(m => ({
                    rawMaterialId: m.rawMaterialId,
                    quantityNeeded: m.quantity * (parseFloat(form.quantityToProduce) || 1)
                  })));
                }
              }}>
                <option value="">— Select a BOM template to auto-fill —</option>
                {boms.map(b => (
                  <option key={b.id} value={b.id}>{b.name} {b.finishedGood ? `(Produces ${b.finishedGood.name})` : ''}</option>
                ))}
              </select>
            </div>
          )}

          {/* Finished Good */}
          <div className="grid grid-cols-3 gap-4">
            <div className="input-group col-span-2">
              <label className="input-label">Finished Good Name *</label>
              <input id="po-name" value={form.finishedGoodName} onChange={handleNameChange}
                placeholder="e.g. Steel Cabinet" className="input" autoFocus/>
            </div>
            <div className="input-group">
              <label className="input-label">SKU</label>
              <input id="po-sku" value={form.finishedGoodSku} onChange={e => { setCustomSku(true); set('finishedGoodSku', e.target.value); }} placeholder="FG-001" className="input"/>
            </div>
            <div className="input-group">
              <label className="input-label">Unit</label>
              <select id="po-unit" value={form.finishedGoodUnit} onChange={e => set('finishedGoodUnit', e.target.value)} className="input">
                {['pcs', 'kg', 'g', 'L', 'ml', 'm', 'cm', 'box', 'pack', 'bottle'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Qty to Produce *</label>
              <input id="po-qty" type="number" min="1" value={form.quantityToProduce}
                onChange={e => set('quantityToProduce', e.target.value)} className="input"/>
            </div>
            <div className="input-group">
              <label className="input-label">Start Date</label>
              <input id="po-date" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className="input"/>
            </div>
          </div>

          {/* Direct Expenses */}
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">Per Unit Labor Cost (₹)</label>
              <input id="po-labor" type="number" min="0" step="0.01" value={form.laborCost} onChange={e => set('laborCost', e.target.value)} placeholder="0.00" className="input"/>
            </div>
            <div className="input-group">
              <label className="input-label">Per Unit Packing / Overhead (₹)</label>
              <input id="po-overhead" type="number" min="0" step="0.01" value={form.overheadCost} onChange={e => set('overheadCost', e.target.value)} placeholder="0.00" className="input"/>
            </div>
          </div>

          {/* Raw Materials Needed */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">Raw Materials Required</p>
              <button id="po-add-material-btn" onClick={addMat} className="btn-ghost text-xs gap-1"><Plus size={13}/>Add Material</button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 px-1 mb-1">
                {['Material', 'Quantity Needed', ''].map((h,i) => (
                  <p key={i} className={`text-[10px] uppercase font-bold text-muted ${i===0?'col-span-7':i===1?'col-span-4':'col-span-1'}`}>{h}</p>
                ))}
              </div>
              {mats.map((m, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <select id={`po-material-select-${i}`} value={m.rawMaterialId} onChange={e => updateMat(i, 'rawMaterialId', e.target.value)}
                    className="input col-span-7 text-xs">
                    <option value="">— Select raw material —</option>
                    {rawMaterials.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.stockQuantity} {r.unit} in stock)</option>
                    ))}
                  </select>
                  <input id={`po-material-qty-${i}`} type="number" min="0" step="0.01" value={m.quantityNeeded}
                    onChange={e => updateMat(i, 'quantityNeeded', e.target.value)}
                    placeholder="Qty" className="input col-span-4 text-xs"/>
                  <button onClick={() => removeMat(i)} disabled={mats.length === 1} className="col-span-1 btn-icon text-danger/60 hover:text-danger">
                    <Trash2 size={13}/>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="input resize-none" rows={2} placeholder="Production notes…"/>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button id="po-submit" onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Create Order'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductionPage() {
  const [orders, setOrders]         = useState([]);
  const [rawMaterials, setRawMats]  = useState([]);
  const [boms, setBoms]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [completing, setCompleting] = useState(null);

  const load = async () => {
    setLoading(true);
    const [ordRes, matRes, bomRes] = await Promise.all([getProductionOrders(), getRawMaterials(), getBOMs()]);
    if (ordRes.success) setOrders(ordRes.data);
    if (matRes.success) setRawMats(matRes.data);
    if (bomRes?.success) setBoms(bomRes.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleComplete = async (id) => {
    setCompleting(id);
    const res = await completeProductionOrder(id);
    setCompleting(null);
    if (res.success) {
      toast.success(`Production completed! ${res.data.finishedProduct.name} added to Finished Goods.`);
      load();
    } else toast.error(res.error);
  };

  const planned   = orders.filter(o => o.status === 'Planned').length;
  const completed = orders.filter(o => o.status === 'Completed').length;

  return (
    <div>
      {showCreate && <CreateOrderModal rawMaterials={rawMaterials} boms={boms} onClose={() => setShowCreate(false)} onSaved={load}/>}

      <div className="page-header">
        <div>
          <h1 className="page-title">Production Orders</h1>
          <p className="page-subtitle">Plan and track your manufacturing runs</p>
        </div>
        <button id="new-po-btn" onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16}/> New Production Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5 bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/30">
          <p className="text-2xl font-bold text-white">{planned}</p>
          <p className="text-sm text-muted mt-1">Planned Orders</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/30">
          <p className="text-2xl font-bold text-white">{orders.length}</p>
          <p className="text-sm text-muted mt-1">Total Orders</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30">
          <p className="text-2xl font-bold text-white">{completed}</p>
          <p className="text-sm text-muted mt-1">Completed</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading
          ? [...Array(3)].map((_,i) => <div key={i} className="card p-5 h-24 animate-pulse bg-white/5"/>)
          : orders.map(order => (
            <div key={order.id} className="card p-5 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-xs text-muted">{order.orderNumber}</span>
                    <span className={`badge text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[order.status]}`}>{order.status}</span>
                  </div>
                  <h3 className="font-bold text-white text-base mb-1">
                    {order.finishedGoodName}
                    {order.finishedGoodSku && <span className="ml-2 text-xs font-mono text-muted">{order.finishedGoodSku}</span>}
                  </h3>
                  <p className="text-sm text-muted">Produce: <span className="text-slate-300 font-semibold">{order.quantityToProduce} pcs</span></p>

                  {/* Materials & Expenses */}
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {order.materials.map(m => (
                        <span key={m.id} className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                          {m.rawMaterial.name}: {m.quantityNeeded} {m.rawMaterial.unit}
                          {m.quantityUsed > 0 && <span className="ml-1 text-success">✓</span>}
                        </span>
                      ))}
                    </div>
                    {((order.laborCost || 0) > 0 || (order.overheadCost || 0) > 0) && (
                      <div className="text-xs text-muted flex gap-3">
                        {order.laborCost > 0 && <span>Labor (Per {order.finishedGoodUnit || 'Unit'}): <span className="font-semibold text-slate-300">{formatCurrency(order.laborCost)}</span></span>}
                        {order.overheadCost > 0 && <span>Overhead (Per {order.finishedGoodUnit || 'Unit'}): <span className="font-semibold text-slate-300">{formatCurrency(order.overheadCost)}</span></span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {order.startDate && <p className="text-xs text-muted">{formatDate(order.startDate)}</p>}
                  {order.status === 'Planned' && (
                    <button onClick={() => handleComplete(order.id)}
                      disabled={completing === order.id}
                      className="btn-primary text-xs gap-1.5">
                      {completing === order.id
                        ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                        : <CheckCircle2 size={13}/>}
                      Mark Complete
                    </button>
                  )}
                  {order.status === 'Completed' && (
                    <div className="text-xs text-success flex items-center gap-1">
                      <CheckCircle2 size={12}/> Completed {formatDate(order.completedDate)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        }
        {!loading && orders.length === 0 && (
          <div className="card p-16 text-center text-muted">
            <Factory size={48} className="mx-auto mb-4 opacity-20"/>
            <p className="text-lg font-semibold text-slate-400 mb-2">No Production Orders</p>
            <p className="text-sm mb-4">Start by adding raw materials, then create your first production order</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto"><Plus size={14}/> New Production Order</button>
          </div>
        )}
      </div>
    </div>
  );
}

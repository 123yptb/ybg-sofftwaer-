'use client';
import { useEffect, useState } from 'react';
import { getBOMs, createBOM, deleteBOM, getRawMaterials, getFinishedGoods } from '@/lib/actions/manufacturing';
import { Plus, X, FileText, Trash2, Beaker } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

function CreateBOMModal({ rawMaterials, finishedGoods, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', description: '', finishedGoodId: '', laborCost: '', overheadCost: '' });
  const [mats, setMats] = useState([{ rawMaterialId: '', quantity: '' }]);
  const [saving, setSaving] = useState(false);
  
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addMat    = () => setMats(m => [...m, { rawMaterialId: '', quantity: '' }]);
  const removeMat = i => setMats(m => m.filter((_, idx) => idx !== i));
  const updateMat = (i, k, v) => setMats(m => m.map((x, idx) => idx === i ? { ...x, [k]: v } : x));

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('BOM Name is required');
    const validMats = mats.filter(m => m.rawMaterialId && m.quantity);
    if (validMats.length === 0) return toast.error('At least one raw material is required');

    setSaving(true);
    const res = await createBOM({ ...form, materials: validMats });
    setSaving(false);
    
    if (res.success) {
      toast.success('Bill of Materials created successfully!');
      onSaved();
      onClose();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card w-full max-w-2xl p-0 overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div>
            <h2 className="font-bold text-white text-lg">New Bill of Materials</h2>
            <p className="text-xs text-muted mt-0.5">Create a template for production</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18}/></button>
        </div>
        
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">BOM Name / Code *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Standard Steel Cabinet BOM" className="input" autoFocus/>
            </div>
            <div className="input-group">
              <label className="input-label">Linked Finished Good</label>
              <select value={form.finishedGoodId} onChange={e => set('finishedGoodId', e.target.value)} className="input">
                <option value="">— Select finished good —</option>
                {finishedGoods.map(fg => (
                  <option key={fg.id} value={fg.id}>{fg.name} ({fg.sku})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">Per Unit Estimated Labor Cost (₹)</label>
              <input type="number" min="0" step="0.01" value={form.laborCost} onChange={e => set('laborCost', e.target.value)} placeholder="0.00" className="input"/>
            </div>
            <div className="input-group">
              <label className="input-label">Per Unit Packing / Overhead (₹)</label>
              <input type="number" min="0" step="0.01" value={form.overheadCost} onChange={e => set('overheadCost', e.target.value)} placeholder="0.00" className="input"/>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">Raw Materials Recipe</p>
              <button onClick={addMat} className="btn-ghost text-xs gap-1"><Plus size={13}/>Add Material</button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 px-1 mb-1">
                {['Material', 'Quantity Required', ''].map((h,i) => (
                  <p key={i} className={`text-[10px] uppercase font-bold text-muted ${i===0?'col-span-7':i===1?'col-span-4':'col-span-1'}`}>{h}</p>
                ))}
              </div>
              {mats.map((m, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <select value={m.rawMaterialId} onChange={e => updateMat(i, 'rawMaterialId', e.target.value)}
                    className="input col-span-7 text-xs">
                    <option value="">— Select raw material —</option>
                    {rawMaterials.map(r => (
                      <option key={r.id} value={r.id}>{r.name} (Cost: {formatCurrency(r.costPrice)})</option>
                    ))}
                  </select>
                  <input type="number" min="0" step="0.01" value={m.quantity}
                    onChange={e => updateMat(i, 'quantity', e.target.value)}
                    placeholder="Qty" className="input col-span-4 text-xs"/>
                  <button onClick={() => removeMat(i)} disabled={mats.length === 1} className="col-span-1 btn-icon text-danger/60 hover:text-danger">
                    <Trash2 size={13}/>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Description / Instructions</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} className="input resize-none" rows={3} placeholder="Process instructions..."/>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save BOM'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BOMPage() {
  const [boms, setBoms]             = useState([]);
  const [rawMaterials, setRawMats]  = useState([]);
  const [finishedGoods, setFG]      = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    const [bomRes, matRes, fgRes] = await Promise.all([getBOMs(), getRawMaterials(), getFinishedGoods()]);
    if (bomRes.success) setBoms(bomRes.data);
    if (matRes.success) setRawMats(matRes.data);
    if (fgRes.success)  setFG(fgRes.data);
    setLoading(false);
  };
  
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this Bill of Materials?')) return;
    const res = await deleteBOM(id);
    if (res.success) {
      toast.success('BOM deleted successfully');
      load();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div>
      {showCreate && <CreateBOMModal rawMaterials={rawMaterials} finishedGoods={finishedGoods} onClose={() => setShowCreate(false)} onSaved={load} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Bill of Materials</h1>
          <p className="page-subtitle">Manage recipes and material templates for production</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16}/> New BOM
        </button>
      </div>

      <div className="space-y-4 mt-6">
        {loading
          ? [...Array(3)].map((_,i) => <div key={i} className="card p-5 h-24 animate-pulse bg-white/5"/>)
          : boms.map(bom => {
              const materialCost = bom.materials.reduce((sum, m) => sum + (m.quantity * (m.rawMaterial?.costPrice || 0)), 0);
              const totalCost = materialCost + (bom.laborCost || 0) + (bom.overheadCost || 0);

              return (
                <div key={bom.id} className="card p-5 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-white text-base">{bom.name}</h3>
                        {bom.finishedGood && (
                          <span className="badge text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Produces: {bom.finishedGood.name}
                          </span>
                        )}
                      </div>
                      
                      {bom.description && <p className="text-sm text-muted mb-3">{bom.description}</p>}

                      <div className="mt-3">
                        <p className="text-xs font-semibold text-slate-300 mb-2">Recipe Components:</p>
                        <div className="flex flex-wrap gap-2">
                          {bom.materials.map(m => (
                            <span key={m.id} className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                              {m.quantity} {m.rawMaterial.unit} × {m.rawMaterial.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 flex-shrink-0 min-w-[150px]">
                      <div className="text-right">
                        <p className="text-xs text-muted">Est. Total Cost</p>
                        <p className="text-lg font-bold text-white">{formatCurrency(totalCost)}</p>
                      </div>
                      <div className="text-[10px] text-muted text-right space-y-0.5">
                        <p>Materials: {formatCurrency(materialCost)}</p>
                        {bom.laborCost > 0 && <p>Labor: {formatCurrency(bom.laborCost)}</p>}
                        {bom.overheadCost > 0 && <p>Overhead: {formatCurrency(bom.overheadCost)}</p>}
                      </div>
                      
                      <button onClick={() => handleDelete(bom.id)} className="btn-ghost text-danger hover:bg-danger/10 text-xs mt-2 px-2 py-1">
                        <Trash2 size={14}/> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
        }
        {!loading && boms.length === 0 && (
          <div className="card p-16 text-center text-muted">
            <Beaker size={48} className="mx-auto mb-4 opacity-20"/>
            <p className="text-lg font-semibold text-slate-400 mb-2">No Bills of Material</p>
            <p className="text-sm mb-4">Create standard recipes and material templates for your finished goods.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto"><Plus size={14}/> New BOM</button>
          </div>
        )}
      </div>
    </div>
  );
}

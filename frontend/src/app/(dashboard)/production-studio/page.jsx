'use client';

import { useState, useEffect } from 'react';
import { getGlobalInventory, getBOMTemplates, createProductionEntry } from '@/lib/actions/inventory';
import { Factory, Plus, ChevronRight, Layers, ArrowRight, Settings2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ProductionStudioPage() {
  const [inventory, setInventory] = useState([]);
  const [boms, setBoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    finishedGoodId: '',
    quantityYield: 1,
    notes: '',
    materials: [] // { rawMaterialId, quantityConsumed, costPrice }
  });

  const loadData = async () => {
    setLoading(true);
    const [invRes, bomRes] = await Promise.all([getGlobalInventory(), getBOMTemplates()]);
    if (invRes.success) setInventory(invRes.data);
    if (bomRes.success) setBoms(bomRes.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const finishedGoods = inventory.filter(p => p.type === 'FINISHED_GOOD');
  const rawMaterials = inventory.filter(p => p.type === 'RAW_MATERIAL');

  // Handle FG selection to auto-fill BOM
  const handleFGSelect = (fgId) => {
    const template = boms.find(b => b.productId === fgId);
    if (template && template.items.length > 0) {
      // Pre-fill materials based on template
      const mats = template.items.map(item => {
        const rm = rawMaterials.find(r => r.id === item.rawMaterialId);
        return {
          rawMaterialId: item.rawMaterialId,
          quantityConsumed: item.quantityRequired * form.quantityYield,
          costPrice: rm ? rm.purchasePrice : 0,
          unit: rm ? rm.unit : 'pcs',
          name: rm ? rm.name : 'Unknown Material'
        };
      });
      setForm({ ...form, finishedGoodId: fgId, materials: mats });
    } else {
      // Clear materials if no BOM
      setForm({ ...form, finishedGoodId: fgId, materials: [] });
    }
  };

  // Update materials when yield changes
  const handleYieldChange = (val) => {
    const qty = parseFloat(val) || 1;
    const template = boms.find(b => b.productId === form.finishedGoodId);
    
    let mats = form.materials;
    if (template) {
      mats = template.items.map(item => {
        const rm = rawMaterials.find(r => r.id === item.rawMaterialId);
        return {
          rawMaterialId: item.rawMaterialId,
          quantityConsumed: item.quantityRequired * qty,
          costPrice: rm ? rm.purchasePrice : 0,
          unit: rm ? rm.unit : 'pcs',
          name: rm ? rm.name : 'Unknown Material'
        };
      });
    }
    setForm({ ...form, quantityYield: qty, materials: mats });
  };

  const addMaterialRow = () => {
    setForm({
      ...form, 
      materials: [...form.materials, { rawMaterialId: '', quantityConsumed: 0, costPrice: 0, unit: '', name: '' }]
    });
  };

  const removeMaterialRow = (idx) => {
    const mats = [...form.materials];
    mats.splice(idx, 1);
    setForm({ ...form, materials: mats });
  };

  const updateMaterial = (idx, field, value) => {
    const mats = [...form.materials];
    mats[idx][field] = value;
    if (field === 'rawMaterialId') {
      const rm = rawMaterials.find(r => r.id === value);
      if (rm) {
        mats[idx].costPrice = rm.purchasePrice;
        mats[idx].unit = rm.unit;
        mats[idx].name = rm.name;
      }
    }
    setForm({ ...form, materials: mats });
  };

  const handleSubmit = async () => {
    if (!form.finishedGoodId) return toast.error('Select a Finished Good to produce.');
    if (form.materials.length === 0) return toast.error('Add at least one raw material.');
    
    // Check stock availability
    for (const mat of form.materials) {
      if (!mat.rawMaterialId) return toast.error('Please select all raw materials.');
      const rm = rawMaterials.find(r => r.id === mat.rawMaterialId);
      if (!rm || rm.stockQuantity < mat.quantityConsumed) {
        return toast.error(`Insufficient stock for ${rm ? rm.name : 'material'}. Have ${rm?.stockQuantity}, need ${mat.quantityConsumed}.`);
      }
    }

    setSaving(true);
    const res = await createProductionEntry(form);
    setSaving(false);

    if (res.success) {
      toast.success('Production entry recorded successfully! Inventory updated.');
      setForm({ finishedGoodId: '', quantityYield: 1, notes: '', materials: [] });
      loadData(); // refresh stock
    } else {
      toast.error(res.error);
    }
  };

  const totalCost = form.materials.reduce((sum, m) => sum + (m.quantityConsumed * m.costPrice), 0);
  const unitCost = form.quantityYield > 0 ? totalCost / form.quantityYield : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Factory className="text-primary"/> Production Studio
        </h1>
        <p className="text-slate-400 mt-1">Transform Raw Materials into Finished Goods seamlessly.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Production Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#131b2f]/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Settings2 size={200}/>
            </div>
            
            <h2 className="text-xl font-bold text-white mb-6 relative z-10">New Production Run</h2>
            
            <div className="grid grid-cols-3 gap-6 relative z-10">
              <div className="col-span-2 space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Output: Finished Good</label>
                <select 
                  value={form.finishedGoodId} 
                  onChange={e => handleFGSelect(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary appearance-none shadow-inner">
                  <option value="">-- Select Finished Good --</option>
                  {finishedGoods.map(fg => (
                    <option key={fg.id} value={fg.id}>{fg.name} {fg.sku ? `(${fg.sku})` : ''}</option>
                  ))}
                </select>
                {form.finishedGoodId && !boms.find(b => b.productId === form.finishedGoodId) && (
                  <p className="text-[11px] text-warning mt-1">No BOM found. Please add materials manually.</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Yield Qty</label>
                <input 
                  type="number" min="1" step="1"
                  value={form.quantityYield} 
                  onChange={e => handleYieldChange(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary shadow-inner text-center font-bold text-lg"
                />
              </div>
            </div>

            <div className="mt-8 relative z-10">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Layers size={16}/> Materials Consumed
                </h3>
                <button onClick={addMaterialRow} className="text-xs font-medium text-primary hover:text-primary-light flex items-center gap-1 transition-colors">
                  <Plus size={14}/> Add Material
                </button>
              </div>

              <div className="space-y-3">
                {form.materials.map((mat, idx) => {
                  const rm = rawMaterials.find(r => r.id === mat.rawMaterialId);
                  const isShort = rm && rm.stockQuantity < mat.quantityConsumed;
                  
                  return (
                    <div key={idx} className="flex gap-3 items-center bg-slate-900/40 p-2 rounded-xl border border-slate-800/60">
                      <select 
                        value={mat.rawMaterialId} 
                        onChange={e => updateMaterial(idx, 'rawMaterialId', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary appearance-none">
                        <option value="">Select Material...</option>
                        {rawMaterials.map(r => (
                          <option key={r.id} value={r.id}>{r.name} (Stock: {r.stockQuantity})</option>
                        ))}
                      </select>
                      
                      <div className="w-32 relative">
                        <input 
                          type="number" 
                          value={mat.quantityConsumed} 
                          onChange={e => updateMaterial(idx, 'quantityConsumed', parseFloat(e.target.value) || 0)}
                          className={`w-full bg-slate-900 border rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:outline-none transition-colors ${isShort ? 'border-danger/50 focus:border-danger' : 'border-slate-700 focus:border-primary'}`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">{mat.unit}</span>
                      </div>
                      
                      <div className="w-24 text-right text-sm text-slate-400 tabular-nums">
                        {formatCurrency(mat.quantityConsumed * mat.costPrice)}
                      </div>

                      <button onClick={() => removeMaterialRow(idx)} className="p-2 text-slate-600 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
                        <Plus size={16} className="rotate-45" />
                      </button>
                    </div>
                  );
                })}
                {form.materials.length === 0 && (
                  <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                    <p className="text-sm text-slate-500">No raw materials selected.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Summary & Submit */}
            <div className="mt-8 pt-6 border-t border-slate-800 flex items-end justify-between relative z-10">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Total Material Cost</p>
                <p className="text-2xl font-bold text-white tabular-nums tracking-tight">{formatCurrency(totalCost)}</p>
                <p className="text-xs text-slate-400">Est. Unit Cost: {formatCurrency(unitCost)}</p>
              </div>
              
              <button 
                onClick={handleSubmit} 
                disabled={saving || !form.finishedGoodId || form.materials.length === 0}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5">
                {saving ? 'Processing...' : 'Execute Production'} <ArrowRight size={18}/>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-3xl p-6 backdrop-blur-md">
            <h3 className="text-lg font-bold text-white mb-4">Stock Overview</h3>
            <div className="space-y-4">
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Raw Materials</p>
                  <p className="text-xl font-bold text-white mt-1">{rawMaterials.length} Items</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Layers size={20}/>
                </div>
              </div>
              
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Finished Goods</p>
                  <p className="text-xl font-bold text-white mt-1">{finishedGoods.length} Items</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success border border-success/20">
                  <Factory size={20}/>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/30 border border-slate-700/50 rounded-3xl p-6 backdrop-blur-md">
            <h3 className="text-lg font-bold text-white mb-4">Active BOMs</h3>
            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-slate-500">Loading templates...</p>
              ) : boms.length === 0 ? (
                <p className="text-sm text-slate-500">No Bill of Materials defined.</p>
              ) : (
                boms.map(bom => (
                  <div key={bom.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800 hover:border-slate-600 transition-colors cursor-pointer" onClick={() => handleFGSelect(bom.productId)}>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{bom.product?.name}</p>
                      <p className="text-xs text-slate-500">{bom.items.length} components</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-600"/>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

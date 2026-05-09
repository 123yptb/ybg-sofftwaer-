'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSuppliers, createBill, getRawMaterials } from '@/lib/actions/manufacturing';
import { Undo2, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

function LineRow({ line, index, onChange, onRemove, canRemove, rawMaterials }) {
  return (
    <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-warning uppercase">Return Line {index + 1}</p>
        {canRemove && <button onClick={() => onRemove(index)} className="btn-icon text-danger/60 hover:text-danger"><Trash2 size={14}/></button>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="input-group">
          <label className="input-label">Material Returned</label>
          <select 
            className="input" 
            value={line.productId || ''} 
            onChange={e => {
              const val = e.target.value;
              onChange(index, 'productId', val);
              const rm = rawMaterials?.find(r => r.id === val);
              if (rm) {
                if (!line.description) onChange(index, 'description', `Return: ${rm.name}`);
                if (!line.unitCost) onChange(index, 'unitCost', rm.purchasePrice || 0);
              }
            }}
          >
            <option value="">— Custom Item —</option>
            {rawMaterials?.map(rm => (
              <option key={rm.id} value={rm.id}>{rm.name}</option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">Description</label>
          <input className="input" value={line.description} onChange={e => onChange(index, 'description', e.target.value)} placeholder="Reason for return..."/>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="input-group">
          <label className="input-label text-warning">Qty (Negative)</label>
          <input className="input text-warning font-medium" type="number" max="-1" value={line.quantity} onChange={e => onChange(index, 'quantity', e.target.value)} placeholder="-1"/>
        </div>
        <div className="input-group">
          <label className="input-label">Unit Cost (₹)</label>
          <input className="input" type="number" min="0" step="0.01" value={line.unitCost} onChange={e => onChange(index, 'unitCost', e.target.value)} placeholder="0.00"/>
        </div>
        <div className="input-group">
          <label className="input-label">GST %</label>
          <input className="input" type="number" min="0" max="100" value={line.taxRate} onChange={e => onChange(index, 'taxRate', e.target.value)}/>
        </div>
      </div>
      <p className="text-right text-sm font-semibold text-warning tabular-nums">
        Debit Amount: {formatCurrency((parseFloat(line.quantity)|| -1) * (parseFloat(line.unitCost)||0))}
      </p>
    </div>
  );
}

export default function NewDebitNotePage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const defaultDate = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ supplierId: '', issueDate: defaultDate, dueDate: defaultDate, notes: 'Debit Note / Purchase Return', supplierRef: '' });
  const [lines, setLines] = useState([{ description: 'Purchase Return', quantity: -1, unitCost: '', taxRate: 0, productId: '' }]);

  useEffect(() => {
    async function load() {
      const [suppRes, rmRes] = await Promise.all([getSuppliers(), getRawMaterials()]);
      if (suppRes.success) setSuppliers(suppRes.data);
      if (rmRes.success) setRawMaterials(rmRes.data);
      setLoading(false);
    }
    load();
  }, []);

  const addLine = () => setLines(l => [...l, { description: 'Purchase Return', quantity: -1, unitCost: '', taxRate: 0, productId: '' }]);
  const removeLine = i => setLines(l => l.filter((_, idx) => idx !== i));
  const updateLine = (i, key, val) => setLines(l => l.map((line, idx) => idx === i ? { ...line, [key]: val } : line));

  const subtotal = lines.reduce((s, l) => s + (parseFloat(l.quantity)|| -1) * (parseFloat(l.unitCost)||0), 0);
  const tax = lines.reduce((s, l) => s + (parseFloat(l.quantity)|| -1) * (parseFloat(l.unitCost)||0) * ((parseFloat(l.taxRate)||0)/100), 0);

  const handleSubmit = async () => {
    if (!form.supplierId) return toast.error('Please select a supplier');
    
    // Ensure all quantities are negative for a debit note
    const formattedLines = lines.map(l => ({
      ...l,
      quantity: parseFloat(l.quantity) > 0 ? -parseFloat(l.quantity) : parseFloat(l.quantity) || -1,
      unitCost: parseFloat(l.unitCost) || 0,
      taxRate: parseFloat(l.taxRate) || 0
    }));

    setSaving(true);
    // Use the bill endpoint to create the debit note (negative bill)
    const res = await createBill({ ...form, billNumber: `DN-${Date.now().toString().slice(-6)}`, status: 'Received', lineItems: formattedLines });
    setSaving(false);

    if (res.success) { 
      toast.success('Debit Note created successfully!');
      router.push('/returns');
    } else {
      toast.error(res.error);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/returns" className="btn-icon bg-surface border border-border hover:border-primary/50 text-slate-300">
          <ArrowLeft size={18}/>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Undo2 className="text-warning" /> Create Debit Note
          </h1>
          <p className="text-sm text-muted">Issue a debit note to a supplier for returned items.</p>
        </div>
      </div>

      <div className="card p-6 space-y-8">
        <div className="grid grid-cols-2 gap-6">
          <div className="input-group">
            <label className="input-label">Supplier *</label>
            <select value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))} className="input">
              <option value="">— Select supplier —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Date of Return</label>
            <input type="date" value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value, dueDate: e.target.value }))} className="input"/>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white">Returned Items</p>
            <button onClick={addLine} className="btn-secondary text-xs gap-1 py-1.5"><Plus size={14}/> Add Item</button>
          </div>
          <div className="space-y-4">
            {lines.map((line, i) => <LineRow key={i} index={i} line={line} rawMaterials={rawMaterials} onChange={updateLine} onRemove={removeLine} canRemove={lines.length > 1}/>)}
          </div>
          
          <div className="mt-6 pt-6 border-t border-border flex justify-end">
            <div className="w-64 space-y-2 text-sm text-right">
              <p className="text-muted flex justify-between"><span>Subtotal:</span> <span className="text-slate-300 tabular-nums">{formatCurrency(subtotal)}</span></p>
              <p className="text-muted flex justify-between"><span>GST Reversal:</span> <span className="text-slate-300 tabular-nums">{formatCurrency(tax)}</span></p>
              <div className="pt-2 border-t border-white/10">
                <p className="font-bold text-warning text-lg flex justify-between"><span>Total Debit:</span> <span className="tabular-nums">{formatCurrency(subtotal + tax)}</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Internal Notes / Reason</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input resize-none" rows={2} placeholder="Reason for the debit note..."/>
        </div>

        <div className="pt-6 border-t border-border flex justify-end gap-3">
          <Link href="/returns" className="btn-secondary">Cancel</Link>
          <button onClick={handleSubmit} disabled={saving} className="btn-warning">
            {saving ? 'Creating...' : 'Issue Debit Note'}
          </button>
        </div>
      </div>
    </div>
  );
}

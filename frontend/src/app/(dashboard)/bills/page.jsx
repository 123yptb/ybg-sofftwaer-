'use client';
import { useEffect, useState } from 'react';
import {
  getBills, createBill, updateBill, deleteBill,
  getSuppliers, createSupplier, getRawMaterials, createRawMaterial, getNextBillNumber,
} from '@/lib/actions/manufacturing';
import { Plus, X, FileText, Trash2, Pencil } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  Draft:    'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  Received: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  Paid:     'bg-green-500/20 text-green-300 border border-green-500/30',
  Overdue:  'bg-red-500/20 text-red-300 border border-red-500/30',
};
const BILL_STATUSES = ['Draft', 'Received', 'Paid', 'Overdue'];

// ── Supplier Quick-Add Modal ───────────────────────────────────────────────────
function SupplierModal({ onClose, onSaved }) {
  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [phone, setPhone]   = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error('Supplier name is required');
    setSaving(true);
    const res = await createSupplier({ name, email, phone });
    setSaving(false);
    if (res.success) { toast.success(`${res.data.name} added!`); onSaved(res.data); onClose(); }
    else toast.error(res.error);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card w-full max-w-sm p-0 overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <h2 className="font-bold text-white">New Supplier</h2>
          <button id="close-supplier-modal" onClick={onClose} className="btn-icon"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="input-group">
            <label className="input-label">Supplier Name *</label>
            <input id="supplier-name" value={name} onChange={e => setName(e.target.value)} autoFocus className="input" placeholder="e.g. Metal Supplies Co"/>
          </div>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input id="supplier-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="input"/>
          </div>
          <div className="input-group">
            <label className="input-label">Phone</label>
            <input id="supplier-phone" value={phone} onChange={e => setPhone(e.target.value)} className="input"/>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button id="add-supplier-btn" onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Add Supplier'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Raw Material Quick-Add Modal ──────────────────────────────────────────────
function RawMaterialModal({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [sku, setSku]   = useState('');
  const [unit, setUnit] = useState('kg');
  const [costPrice, setCostPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error('Raw material name is required');
    setSaving(true);
    const res = await createRawMaterial({ name, sku, unit, costPrice: parseFloat(costPrice) || 0, minStockLevel: 0 });
    setSaving(false);
    if (res.success) { toast.success(`${res.data.name} added!`); onSaved(res.data); onClose(); }
    else toast.error(res.error);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card w-full max-w-sm p-0 overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <h2 className="font-bold text-white">New Raw Material</h2>
          <button onClick={onClose} className="btn-icon"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="input-group">
            <label className="input-label">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} autoFocus className="input" placeholder="e.g. Aluminum Sheet"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">SKU</label>
              <input value={sku} onChange={e => setSku(e.target.value)} className="input uppercase" placeholder="ALU-01"/>
            </div>
            <div className="input-group">
              <label className="input-label">Unit</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} className="input">
                {['kg', 'g', 'L', 'ml', 'pcs', 'm', 'cm', 'box'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Standard Cost (₹)</label>
            <input type="number" min="0" step="0.01" value={costPrice} onChange={e => setCostPrice(e.target.value)} className="input" placeholder="0.00"/>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Add Material'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bill Line Row ──────────────────────────────────────────────────────────────
function BillLineRow({ index, line, rawMaterials, onChange, onRemove, canRemove, isDuplicate, onNewMaterial }) {
  const handleMatSelect = (matId) => {
    const mat = rawMaterials.find(m => m.id === matId);
    onChange(index, { ...line, productId: matId, description: mat ? mat.name : line.description, unitPrice: mat ? String(mat.costPrice) : line.unitPrice });
  };
  const amount = (parseFloat(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0);
  return (
    <div className={`p-4 rounded-lg border space-y-3 ${isDuplicate ? 'bg-red-500/10 border-red-500/40' : 'bg-white/5 border-border'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-muted uppercase">Line {index + 1}</p>
          {isDuplicate && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40">⚠ Duplicate!</span>
          )}
        </div>
        {canRemove && <button onClick={() => onRemove(index)} className="btn-icon text-danger/60 hover:text-danger"><Trash2 size={14}/></button>}
      </div>
      <div className="input-group">
        <label className="input-label">Raw Material</label>
        <div className="flex gap-2">
          <select id={`bill-line-material-${index}`} value={line.productId} onChange={e => handleMatSelect(e.target.value)} className="input flex-1">
            <option value="">— Select raw material —</option>
            {rawMaterials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit}) — ₹{m.costPrice}/unit</option>)}
          </select>
          {onNewMaterial && (
            <button onClick={() => onNewMaterial(index)} className="btn-secondary px-3 shrink-0" title="Add new raw material">
              <Plus size={14}/>
            </button>
          )}
        </div>
      </div>
      {!line.productId && (
        <div className="input-group">
          <label className="input-label">Description</label>
          <input id={`bill-line-desc-${index}`} value={line.description} onChange={e => onChange(index, { ...line, description: e.target.value })} className="input" placeholder="Custom item"/>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div className="input-group">
          <label className="input-label">Quantity</label>
          <input id={`bill-line-qty-${index}`} type="number" min="0.01" step="0.01" value={line.quantity} onChange={e => onChange(index, { ...line, quantity: e.target.value })} className="input"/>
        </div>
        <div className="input-group">
          <label className="input-label">Cost/Unit (₹)</label>
          <input id={`bill-line-price-${index}`} type="number" min="0" step="0.01" value={line.unitPrice} onChange={e => onChange(index, { ...line, unitPrice: e.target.value })} className="input" placeholder="0.00"/>
        </div>
        <div className="input-group">
          <label className="input-label">GST %</label>
          <input id={`bill-line-tax-${index}`} type="number" min="0" max="100" value={line.taxRate} onChange={e => onChange(index, { ...line, taxRate: e.target.value })} className="input"/>
        </div>
      </div>
      <p className="text-right text-sm font-semibold text-white tabular-nums">Amount: {formatCurrency(amount)}</p>
    </div>
  );
}

// ── Create Bill Modal ──────────────────────────────────────────────────────────
function BillModal({ suppliers: initSuppliers, rawMaterials, onClose, onSaved }) {
  const [supplierId, setSupplierId]         = useState('');
  const [purchaseBillNo, setPurchaseBillNo] = useState('');
  const [billNoLoading, setBillNoLoading]   = useState(true);
  const [dueDate, setDueDate]               = useState(new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0,10));
  const [notes, setNotes]                   = useState('');
  const [lines, setLines]                   = useState([{ productId: '', description: '', quantity: 1, unitPrice: '', taxRate: 0 }]);
  const [saving, setSaving]                 = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [showNewMaterialLine, setShowNewMaterialLine] = useState(null); // null or index
  const [localSuppliers, setLocalSuppliers]   = useState(initSuppliers);
  const [localMats, setLocalMats]             = useState(rawMaterials);

  useEffect(() => {
    getNextBillNumber().then(res => {
      if (res.success) setPurchaseBillNo(res.data);
      setBillNoLoading(false);
    });
  }, []);

  const addLine    = () => setLines(l => [...l, { productId: '', description: '', quantity: 1, unitPrice: '', taxRate: 0 }]);
  const removeLine = i => setLines(l => l.filter((_, idx) => idx !== i));
  const updateLine = (i, newLine) => setLines(l => {
    const arr = l.map((x, idx) => idx === i ? newLine : x);
    if (i === l.length - 1 && (newLine.productId || newLine.description)) {
      arr.push({ productId: '', description: '', quantity: 1, unitPrice: '', taxRate: 0 });
    }
    return arr;
  });

  const subtotal = lines.reduce((s, l) => s + (parseFloat(l.quantity)||0) * (parseFloat(l.unitPrice)||0), 0);
  const tax      = lines.reduce((s, l) => s + (parseFloat(l.quantity)||0) * (parseFloat(l.unitPrice)||0) * ((parseFloat(l.taxRate)||0)/100), 0);

  const handleSubmit = async () => {
    if (!supplierId) return toast.error('Please select a supplier');
    if (!dueDate)    return toast.error('Due date is required');

    // Duplicate product check — same raw material selected more than once
    const productIds = lines.map(l => l.productId).filter(Boolean);
    const dupId = productIds.find((id, i) => productIds.indexOf(id) !== i);
    if (dupId) {
      const mat = lines.find(l => l.productId === dupId);
      const name = mat?.description || dupId;
      return toast.error(`Duplicate item: "${name}" appears more than once. Merge the quantities instead.`);
    }

    setSaving(true);
    const res = await createBill({ supplierId, purchaseBillNo, dueDate, notes, lineItems: lines });
    setSaving(false);
    if (res.success) { toast.success(`${res.data.billNumber} created! Stock updated.`); onClose(); onSaved(); }
    else toast.error(res.error);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      {showNewSupplier && (
        <SupplierModal onClose={() => setShowNewSupplier(false)} onSaved={s => { setLocalSuppliers(ls => [...ls, s]); setSupplierId(s.id); }}/>
      )}
      {showNewMaterialLine !== null && (
        <RawMaterialModal onClose={() => setShowNewMaterialLine(null)} onSaved={m => {
          setLocalMats(lm => [...lm, m]);
          updateLine(showNewMaterialLine, { ...lines[showNewMaterialLine], productId: m.id, description: m.name, unitPrice: String(m.costPrice) });
          setShowNewMaterialLine(null);
        }}/>
      )}
      <div className="card w-full max-w-xl p-0 overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div><h2 className="font-bold text-white text-lg">New Purchase Bill</h2><p className="text-xs text-muted">Record raw material purchase</p></div>
          <button id="close-bill-modal" onClick={onClose} className="btn-icon"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="input-group">
            <label className="input-label">Supplier *</label>
            <div className="flex gap-2">
              <select id="bill-supplier-select" value={supplierId} onChange={e => setSupplierId(e.target.value)} className="input flex-1">
                <option value="">— Select supplier —</option>
                {localSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button id="new-supplier-btn" onClick={() => setShowNewSupplier(true)} className="btn-secondary px-3 shrink-0" title="Add new supplier"><Plus size={14}/></button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label flex items-center gap-2">
                Purchase Bill No
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/20 text-primary-light border border-primary/30">AUTO</span>
              </label>
              <input id="bill-purchase-no" type="text" value={billNoLoading ? 'Loading…' : purchaseBillNo} onChange={e => setPurchaseBillNo(e.target.value)} className="input font-mono" placeholder="e.g. BILL-0001" disabled={billNoLoading}/>
            </div>
            <div className="input-group">
              <label className="input-label">Due Date</label>
              <input id="bill-due-date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input"/>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">Materials Purchased</p>
              <button id="add-bill-line" onClick={addLine} className="btn-ghost text-xs gap-1"><Plus size={13}/> Add Line</button>
            </div>
            <div className="space-y-3">
              {lines.map((line, i) => {
                const dupIds = lines.map(l => l.productId).filter(Boolean);
                const isDup  = line.productId && dupIds.filter(id => id === line.productId).length > 1;
                return <BillLineRow key={i} index={i} line={line} rawMaterials={localMats} onChange={updateLine} onRemove={removeLine} canRemove={lines.length > 1} isDuplicate={isDup} onNewMaterial={setShowNewMaterialLine}/>;
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-border space-y-1 text-sm text-right">
              <p className="text-muted">Subtotal: <span className="text-slate-300 tabular-nums">{formatCurrency(subtotal)}</span></p>
              <p className="text-muted">GST: <span className="text-slate-300 tabular-nums">{formatCurrency(tax)}</span></p>
              <p className="font-bold text-white text-base">Total: <span className="tabular-nums">{formatCurrency(subtotal + tax)}</span></p>
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Notes (optional)</label>
            <textarea id="bill-notes" value={notes} onChange={e => setNotes(e.target.value)} className="input resize-none" rows={2} placeholder="Purchase order reference…"/>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button id="record-purchase-btn" onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Record Purchase'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Bill Modal ────────────────────────────────────────────────────────────
function EditBillModal({ bill, suppliers, rawMaterials, onClose, onSaved }) {
  const [supplierId, setSupplierId] = useState(bill.supplierId);
  const [dueDate, setDueDate]       = useState(bill.dueDate ? new Date(bill.dueDate).toISOString().slice(0,10) : '');
  const [notes, setNotes]           = useState(bill.notes || '');
  const [status, setStatus]         = useState(bill.status);
  const [lines, setLines]           = useState(
    bill.lineItems?.length
      ? bill.lineItems.map(l => ({
          productId:   l.productId || '',
          description: l.description || '',
          quantity:    l.quantity,
          unitPrice:   l.unitPrice,
          taxRate:     l.taxRate || 0,
        }))
      : [{ productId: '', description: '', quantity: 1, unitPrice: '', taxRate: 0 }]
  );
  const [saving, setSaving] = useState(false);
  const [showNewMaterialLine, setShowNewMaterialLine] = useState(null);
  const [localMats, setLocalMats] = useState(rawMaterials);

  const addLine    = () => setLines(l => [...l, { productId: '', description: '', quantity: 1, unitPrice: '', taxRate: 0 }]);
  const removeLine = i  => setLines(l => l.filter((_, idx) => idx !== i));
  const updateLine = (i, newLine) => setLines(l => {
    const arr = l.map((x, idx) => idx === i ? newLine : x);
    if (i === l.length - 1 && (newLine.productId || newLine.description)) {
      arr.push({ productId: '', description: '', quantity: 1, unitPrice: '', taxRate: 0 });
    }
    return arr;
  });

  const subtotal = lines.reduce((s, l) => s + (parseFloat(l.quantity)||0) * (parseFloat(l.unitPrice)||0), 0);
  const tax      = lines.reduce((s, l) => s + (parseFloat(l.quantity)||0) * (parseFloat(l.unitPrice)||0) * ((parseFloat(l.taxRate)||0)/100), 0);

  const handleSubmit = async () => {
    // Duplicate product check
    const productIds = lines.map(l => l.productId).filter(Boolean);
    const dupId = productIds.find((id, i) => productIds.indexOf(id) !== i);
    if (dupId) {
      const mat = lines.find(l => l.productId === dupId);
      const name = mat?.description || dupId;
      return toast.error(`Duplicate item: "${name}" appears more than once. Merge the quantities instead.`);
    }

    setSaving(true);
    const res = await updateBill(bill.id, { supplierId, dueDate, notes, status, lineItems: lines });
    setSaving(false);
    if (res.success) { toast.success(`${bill.billNumber} updated!`); onClose(); onSaved(); }
    else toast.error(res.error);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      {showNewMaterialLine !== null && (
        <RawMaterialModal onClose={() => setShowNewMaterialLine(null)} onSaved={m => {
          setLocalMats(lm => [...lm, m]);
          updateLine(showNewMaterialLine, { ...lines[showNewMaterialLine], productId: m.id, description: m.name, unitPrice: String(m.costPrice) });
          setShowNewMaterialLine(null);
        }}/>
      )}
      <div className="card w-full max-w-xl p-0 overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div>
            <h2 className="font-bold text-white text-lg">Edit Bill</h2>
            <p className="text-xs font-mono text-primary-light">{bill.billNumber}</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18}/></button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Supplier + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">Supplier</label>
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="input">
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="input">
                {BILL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input"/>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">Materials Purchased</p>
              <button onClick={addLine} className="btn-ghost text-xs gap-1"><Plus size={13}/> Add Line</button>
            </div>
            <div className="space-y-3">
              {lines.map((line, i) => {
                const dupIds = lines.map(l => l.productId).filter(Boolean);
                const isDup  = line.productId && dupIds.filter(id => id === line.productId).length > 1;
                return (
                  <BillLineRow
                    key={i}
                    index={i}
                    line={line}
                    rawMaterials={localMats}
                    onChange={updateLine}
                    onRemove={removeLine}
                    canRemove={lines.length > 1}
                    isDuplicate={isDup}
                    onNewMaterial={setShowNewMaterialLine}
                  />
                );
              })}
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
export default function BillsPage() {
  const [bills, setBills]         = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [rawMats, setRawMats]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showBill, setShowBill]   = useState(false);
  const [editingBill, setEditingBill] = useState(null);

  const load = async () => {
    setLoading(true);
    const [bRes, sRes, mRes] = await Promise.all([getBills(), getSuppliers(), getRawMaterials()]);
    if (bRes.success) setBills(bRes.data);
    if (sRes.success) setSuppliers(sRes.data);
    if (mRes.success) setRawMats(mRes.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this bill?')) return;
    const res = await deleteBill(id);
    if (res.success) {
      toast.success('Bill deleted successfully');
      load();
    } else {
      toast.error(res.error || 'Failed to delete bill');
    }
  };

  const totalDue = bills.reduce((s, b) => s + b.amountDue, 0);

  return (
    <div>
      {showBill && (
        <BillModal suppliers={suppliers} rawMaterials={rawMats} onClose={() => setShowBill(false)} onSaved={load}/>
      )}
      {editingBill && (
        <EditBillModal bill={editingBill} suppliers={suppliers} rawMaterials={rawMats} onClose={() => setEditingBill(null)} onSaved={load}/>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase Bills</h1>
          <p className="page-subtitle">Track raw material purchases from suppliers</p>
        </div>
        <button id="new-bill-btn" onClick={() => setShowBill(true)} className="btn-primary">
          <Plus size={16}/> New Purchase Bill
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <p className="text-2xl font-bold text-white">{bills.length}</p>
          <p className="text-sm text-muted mt-1">Total Bills</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-danger/20 to-danger/5 border-danger/30">
          <p className="text-2xl font-bold text-white">{formatCurrency(totalDue)}</p>
          <p className="text-sm text-muted mt-1">Total Due</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-success/20 to-success/5 border-success/30">
          <p className="text-2xl font-bold text-white">{suppliers.length}</p>
          <p className="text-sm text-muted mt-1">Suppliers</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Bill #</th><th>Purchase Bill No</th><th>Supplier</th><th>Date</th><th>Due Date</th>
              <th>Total</th><th>Due</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(3)].map((_,i) => <tr key={i}>{[...Array(9)].map((_,j)=><td key={j}><div className="h-4 bg-white/5 rounded animate-pulse"/></td>)}</tr>)
              : bills.map(b => (
                <tr key={b.id}>
                  <td className="font-mono text-sm text-primary-light">{b.billNumber}</td>
                  <td className="font-mono text-xs text-slate-300">{b.billNumber}</td>
                  <td className="font-semibold text-slate-200">{b.supplier.name}</td>
                  <td className="text-muted text-sm">{formatDate(b.issueDate)}</td>
                  <td className="text-muted text-sm">{formatDate(b.dueDate)}</td>
                  <td className="tabular-nums font-semibold">{formatCurrency(b.totalAmount)}</td>
                  <td className="tabular-nums">{formatCurrency(b.amountDue)}</td>
                  <td><span className={`badge text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[b.status]||STATUS_BADGE.Draft}`}>{b.status}</span></td>
                  <td>
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setEditingBill(b)}
                        className="btn-icon text-muted hover:text-primary-light"
                        title="Edit bill"
                      >
                        <Pencil size={14}/>
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="btn-icon text-muted hover:text-danger"
                        title="Delete bill"
                      >
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            }
            {!loading && bills.length === 0 && (
              <tr><td colSpan={9} className="text-center py-16 text-muted">
                <FileText size={40} className="mx-auto mb-3 opacity-20"/>
                <p className="mb-3">No purchase bills yet</p>
                <button onClick={() => setShowBill(true)} className="btn-primary mx-auto"><Plus size={14}/> Record First Purchase</button>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

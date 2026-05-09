'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { paymentsApi, customersApi, suppliersApi } from '@/lib/api';
import { Banknote, Wallet, CreditCard, ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NewPaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [entities, setEntities] = useState([]);
  
  const [form, setForm] = useState({
    type: 'Receipt', // Receipt (In), Payment (Out)
    entityType: 'Customer',
    entityId: '',
    amount: '',
    method: 'Cash',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNo: '',
    notes: '',
    chequeDetails: {
      chequeNo: '',
      bankName: '',
      branch: '',
      chequeDate: new Date().toISOString().split('T')[0],
      maturityDate: new Date().toISOString().split('T')[0],
    }
  });

  // Fetch entities based on type
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        if (form.entityType === 'Customer') {
          const r = await customersApi.list();
          setEntities(r.data.customers);
        } else {
          const r = await suppliersApi.list();
          setEntities(r.data.suppliers);
        }
      } catch (e) { toast.error('Failed to load customers/suppliers'); }
    };
    fetchEntities();
  }, [form.entityType]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setForm(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (form.method !== 'Cheque') delete payload.chequeDetails;
      
      await paymentsApi.create(payload);
      toast.success(`${form.type} recorded successfully!`);
      router.push('/payments');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="btn-icon">
          <ArrowLeft size={18}/>
        </button>
        <div>
          <h1 className="page-title">Record Transaction</h1>
          <p className="page-subtitle">Add a new receipt or payment to the ledger</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Transaction Type */}
          <div className="input-group md:col-span-2">
            <label className="input-label">Transaction Type</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm(f => ({ ...f, type: 'Receipt', entityType: 'Customer' }))}
                className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold transition-all ${form.type === 'Receipt' ? 'bg-success/10 border-success text-success shadow-glow-sm' : 'bg-surface border-border text-muted opacity-50'}`}>
                <Banknote size={18}/> RECEIPT (IN)
              </button>
              <button type="button" onClick={() => setForm(f => ({ ...f, type: 'Payment', entityType: 'Supplier' }))}
                className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold transition-all ${form.type === 'Payment' ? 'bg-danger/10 border-danger text-danger shadow-glow-sm' : 'bg-surface border-border text-muted opacity-50'}`}>
                <Wallet size={18}/> PAYMENT (OUT)
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">{form.entityType}</label>
            <select name="entityId" required value={form.entityId} onChange={handleChange} className="input">
              <option value="">Select {form.entityType}...</option>
              {entities.map(e => (
                <option key={e.id} value={e.id}>{e.name || e.full_name}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
              <input type="number" step="0.01" name="amount" required value={form.amount} onChange={handleChange} className="input pl-8" placeholder="0.00"/>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Payment Method</label>
            <select name="method" value={form.method} onChange={handleChange} className="input">
              <option value="Cash">Cash</option>
              <option value="Bank">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Date</label>
            <input type="date" name="paymentDate" value={form.paymentDate} onChange={handleChange} className="input"/>
          </div>

          <div className="input-group md:col-span-2">
            <label className="input-label">Reference / Slip #</label>
            <input type="text" name="referenceNo" value={form.referenceNo} onChange={handleChange} className="input" placeholder="e.g. TXN-9922"/>
          </div>
        </div>

        {/* Conditional Cheque Details */}
        {form.method === 'Cheque' && (
          <div className="card p-6 border-primary/30 animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="text-sm font-bold text-primary-light mb-4 flex items-center gap-2">
              <CreditCard size={16}/> CHEQUE DETAILS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="input-group">
                <label className="input-label">Cheque Number</label>
                <input type="text" name="chequeDetails.chequeNo" required value={form.chequeDetails.chequeNo} onChange={handleChange} className="input" placeholder="000123"/>
              </div>
              <div className="input-group">
                <label className="input-label">Bank Name</label>
                <input type="text" name="chequeDetails.bankName" required value={form.chequeDetails.bankName} onChange={handleChange} className="input" placeholder="Chase / HSBC"/>
              </div>
              <div className="input-group">
                <label className="input-label">Maturity Date (Post-dated)</label>
                <input type="date" name="chequeDetails.maturityDate" required value={form.chequeDetails.maturityDate} onChange={handleChange} className="input"/>
              </div>
              <div className="input-group">
                <label className="input-label">Branch (Optional)</label>
                <input type="text" name="chequeDetails.branch" value={form.chequeDetails.branch} onChange={handleChange} className="input"/>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 py-4 text-lg shadow-glow">
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Save size={20}/> Post Transaction</>}
          </button>
        </div>
      </form>
    </div>
  );
}

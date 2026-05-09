'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { getAccounts, getAccountGroups, createAccount } from '@/lib/actions/accounts';
import { createJournalVoucher } from '@/lib/actions/transactions';
import toast from 'react-hot-toast';

function QuickAccountModal({ groups, accounts, onClose, onSaved }) {
  const generateCode = (type) => {
    const prefixes = { ASSET: '1', LIABILITY: '2', EQUITY: '3', REVENUE: '4', EXPENSE: '5', INCOME: '4' };
    const prefix = prefixes[type] || '1';
    const typeAccounts = accounts.filter(a => a.type === type || (type === 'REVENUE' && a.type === 'INCOME'));
    if (typeAccounts.length === 0) return `${prefix}000`;
    const numbers = typeAccounts.map(a => {
      const match = a.code.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    }).filter(n => !isNaN(n) && n.toString().startsWith(prefix));
    if (numbers.length === 0) return `${prefix}000`;
    return (Math.max(...numbers) + 1).toString();
  };

  const [saving, setSaving] = useState(false);
  const [formType, setFormType] = useState('ASSET');
  const [formCode, setFormCode] = useState(generateCode('ASSET'));
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.target);
    const res = await createAccount(formData);
    setSaving(false);
    
    if (res.success) {
      toast.success('Account created!');
      onSaved(res.data);
      onClose();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={handleSubmit} className="card w-full max-w-md p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
          <h2 className="font-bold text-white">New Account</h2>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-white/70">Account Code *</label>
              <input name="code" value={formCode} onChange={e => setFormCode(e.target.value)} required className="input w-full border-white/10" placeholder="e.g. 1000"/>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-white/70">Account Type *</label>
              <select name="type" value={formType} onChange={e => {
                setFormType(e.target.value);
                setFormCode(generateCode(e.target.value));
              }} required className="input w-full border-white/10 text-white">
                <option className="bg-slate-900 text-white" value="ASSET">Asset</option>
                <option className="bg-slate-900 text-white" value="LIABILITY">Liability</option>
                <option className="bg-slate-900 text-white" value="EQUITY">Equity</option>
                <option className="bg-slate-900 text-white" value="REVENUE">Revenue</option>
                <option className="bg-slate-900 text-white" value="EXPENSE">Expense</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/70">Account Name *</label>
            <input name="name" required className="input w-full border-white/10" placeholder="e.g. Cash in Hand"/>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/70">Account Group (Optional)</label>
            <select name="groupId" className="input w-full border-white/10 text-white">
              <option className="bg-slate-900 text-white" value="">— No Group —</option>
              {groups.map(g => <option className="bg-slate-900 text-white" key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-white/10 bg-white/5">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Saving...' : 'Create Account'}</button>
        </div>
      </form>
    </div>
  );
}

export default function NewTransactionPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [accounts, setAccounts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [activeEntryId, setActiveEntryId] = useState(null); // to know which dropdown to auto-select

  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState([
    { id: '1', accountId: '', amount: '', type: 'DEBIT' },
    { id: '2', accountId: '', amount: '', type: 'CREDIT' }
  ]);

  const loadAccounts = async () => {
    const res = await getAccounts();
    if (res.success) setAccounts(res.data);
    else toast.error('Failed to load accounts for dropdown');
  };

  useEffect(() => {
    loadAccounts();
    getAccountGroups().then(res => {
      if (res.success) setGroups(res.data);
    });
  }, []);

  const addEntry = () => {
    setEntries([...entries, { id: Date.now().toString(), accountId: '', amount: '', type: 'DEBIT' }]);
  };

  const removeEntry = (id) => {
    if (entries.length <= 2) return;
    setEntries(entries.filter(e => e.id !== id));
  };

  const updateEntry = (id, field, value) => {
    setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  // Calculate Subtotals
  const { totalDebit, totalCredit, difference } = useMemo(() => {
    let d = 0;
    let c = 0;
    entries.forEach(e => {
      const amt = Number(e.amount) || 0;
      if (e.type === 'DEBIT') d += amt;
      else if (e.type === 'CREDIT') c += amt;
    });
    return {
      totalDebit: d,
      totalCredit: c,
      difference: Math.abs(d - c)
    };
  }, [entries]);

  // Only check balance and accounts — description is OPTIONAL
  const isBalanced = difference < 0.001 
    && totalDebit > 0 
    && entries.every(e => e.accountId && Number(e.amount) > 0);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate with clear user feedback
    if (totalDebit === 0) {
      toast.error('Please enter at least one debit and one credit entry.');
      return;
    }
    if (entries.some(e => !e.accountId)) {
      toast.error('Please select an account for every entry line.');
      return;
    }
    if (entries.some(e => !Number(e.amount) > 0)) {
      toast.error('All amounts must be greater than zero.');
      return;
    }
    if (difference >= 0.001) {
      toast.error(`Voucher is not balanced. Difference: ₹${difference.toFixed(2)}`);
      return;
    }

    startTransition(async () => {
      const payload = {
        description: description.trim() || 'Journal Entry',
        date,
        entries: entries.map(e => ({
          accountId: e.accountId,
          amount: e.amount,
          type: e.type
        }))
      };

      const res = await createJournalVoucher(payload);
      if (res.success) {
        toast.success('✅ Journal Voucher posted successfully!');
        router.push('/accounts');
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {showAccountModal && (
        <QuickAccountModal 
          groups={groups} 
          accounts={accounts}
          onClose={() => setShowAccountModal(false)} 
          onSaved={(newAcc) => {
            loadAccounts();
            if (activeEntryId) updateEntry(activeEntryId, 'accountId', newAcc.id);
          }} 
        />
      )}

      <div className="page-header">
        <h1 className="text-3xl font-bold text-white tracking-tight">New Journal Voucher</h1>
        <p className="text-muted mt-1 text-sm">Create a balanced double-entry transaction</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="card p-6 border border-white/5 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Date</label>
              <input 
                type="date" 
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input w-full bg-body border-white/10 text-white focus:border-primary" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Description / Memo</label>
              <input 
                type="text" 
                required
                placeholder="e.g., Monthly Rent Payment"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input w-full bg-body border-white/10 text-white focus:border-primary" 
              />
            </div>
          </div>
        </div>

        <div className="card p-0 border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-6 py-4 font-medium w-1/2">Account</th>
                  <th className="px-6 py-4 font-medium w-48">Type</th>
                  <th className="px-6 py-4 font-medium text-right w-48">Amount</th>
                  <th className="px-6 py-4 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {entries.map((entry, index) => (
                  <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <select
                          id={`journal-account-select-${index}`}
                          required
                          value={entry.accountId}
                          onChange={(e) => updateEntry(entry.id, 'accountId', e.target.value)}
                          className="input w-full bg-body/50 border-white/10 focus:border-primary appearance-none text-white/90"
                        >
                          <option className="bg-slate-900 text-white" value="" disabled>Select an account...</option>
                          {accounts.map(acc => (
                            <option className="bg-slate-900 text-white" key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name} ({acc.type})
                            </option>
                          ))}
                        </select>
                        <button 
                          type="button" 
                          id={`journal-add-account-btn-${index}`}
                          onClick={() => {
                            setActiveEntryId(entry.id);
                            setShowAccountModal(true);
                          }}
                          className="p-2 border border-white/10 rounded-md text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                          title="Instantly Register New Account"
                        >
                          <Plus size={16}/>
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        id={`journal-type-select-${index}`}
                        value={entry.type}
                        onChange={(e) => updateEntry(entry.id, 'type', e.target.value)}
                        className={`input w-full border-white/10 appearance-none font-medium ${entry.type === 'DEBIT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}
                      >
                        <option className="bg-slate-900 text-white" value="DEBIT">Debit</option>
                        <option className="bg-slate-900 text-white" value="CREDIT">Credit</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <input
                          id={`journal-amount-input-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          placeholder="0.00"
                          value={entry.amount}
                          onChange={(e) => updateEntry(entry.id, 'amount', e.target.value)}
                          className="input w-full border-white/10 text-right tabular-nums focus:border-primary bg-body/50"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.id)}
                        disabled={entries.length <= 2}
                        className="p-2 text-muted hover:text-rose-400 disabled:opacity-30 transition-colors rounded-md hover:bg-white/5"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-white/5 bg-white/[0.01]">
            <button
              type="button"
              onClick={addEntry}
              className="text-sm font-medium text-primary-light hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Plus size={16} /> Add Line
            </button>
          </div>
        </div>

        {/* Live Total Footer */}
        <div className="card p-6 border border-white/5 bg-gradient-to-br from-white/5 to-transparent flex items-center justify-between">
          <div className="flex gap-12">
            <div>
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Total Debit</p>
              <p className="text-2xl font-bold tabular-nums text-emerald-400">${totalDebit.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Total Credit</p>
              <p className="text-2xl font-bold tabular-nums text-rose-400">${totalCredit.toFixed(2)}</p>
            </div>
            <div className="pl-8 border-l border-white/10">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Difference</p>
              <p className={`text-2xl font-bold tabular-nums flex items-center gap-2 ${difference < 0.001 ? 'text-white/40' : 'text-amber-500'}`}>
                ${difference.toFixed(2)}
                {difference < 0.001 ? <CheckCircle2 size={20} className="text-emerald-500" /> : <AlertCircle size={20} />}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isBalanced || isPending}
            className="btn-primary py-3 px-8 text-lg shadow-glow disabled:shadow-none transition-all disabled:opacity-50"
          >
            {isPending && <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 -ml-2 align-text-bottom"></span>}
            {isPending ? 'Posting...' : 'Post Voucher'}
          </button>
        </div>
      </form>
    </div>
  );
}

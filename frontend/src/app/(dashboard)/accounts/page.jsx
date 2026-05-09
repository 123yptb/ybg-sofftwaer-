'use client';

import { useState, useEffect } from 'react';
import SearchableSelect from '@/components/ui/SearchableSelect';

import { 
  Plus, X, ChevronRight, FolderTree, Search, History
} from 'lucide-react';
import { createAccount, createAccountGroup, getAccountsData, setupDefaultAccounts } from '@/lib/actions/accounts';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'ASSET',     label: 'Real (Asset)',        description: 'Cash, Bank, Stock, Fixed Assets',  icon: '🏦' },
  { value: 'LIABILITY', label: 'Personal (Liability)', description: 'Loans, Creditors, Payables',        icon: '📋' },
  { value: 'EQUITY',    label: 'Equity (Capital)',     description: 'Owner capital, Retained earnings',  icon: '💼' },
  { value: 'INCOME',    label: 'Nominal (Income)',     description: 'Revenue, Sales, Interest received',  icon: '📈' },
  { value: 'EXPENSE',   label: 'Nominal (Expense)',    description: 'Salaries, Rent, Utilities',          icon: '📉' },
];


export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [isSubmitting, setIsSubmitting]  = useState(false);
  const [isSettingUp, setIsSettingUp]    = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupModal, setGroupModal] = useState({ open: false, prefill: '', type: '' });
  
  const [formType, setFormType]   = useState('ASSET');
  const [formCode, setFormCode]   = useState('');
  const [formGroupId, setFormGroupId] = useState('');

  const generateCode = (type, currentAccounts) => {
    const prefixes = { ASSET: '1', LIABILITY: '2', EQUITY: '3', INCOME: '4', EXPENSE: '5' };
    const prefix = prefixes[type] || '1';
    
    const typeAccounts = currentAccounts.filter(a => a.type === type);
    if (typeAccounts.length === 0) return `${prefix}000`;
    
    const numbers = typeAccounts.map(a => {
      const codeVal = a.code || a.accountCode || '';
      const match = codeVal.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    }).filter(n => !isNaN(n) && n.toString().startsWith(prefix));
    
    if (numbers.length === 0) return `${prefix}000`;
    
    return (Math.max(...numbers) + 1).toString();
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await getAccountsData();
    if (res.success) {
      setAccounts(res.data.accounts);
      setGroups(res.data.groups);
    } else {
      toast.error(res.error || 'Failed to load accounts');
    }
    setLoading(false);
  };

  const handleSetupDefault = async () => {
    if (!confirm('This will create 34 standard accounts (Assets, Liabilities, Equity, Income & Expenses) for your organisation. Continue?')) return;
    setIsSettingUp(true);
    const res = await setupDefaultAccounts();
    setIsSettingUp(false);
    if (res.success) {
      toast.success(`✅ ${res.count} standard accounts created successfully!`);
      loadData();
    } else {
      toast.error(res.error);
    }
  };

  const filteredAccounts = selectedGroup 
    ? accounts.filter(a => a.groupId === selectedGroup || a.type === selectedGroup)
    : accounts;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] animate-fade-in overflow-hidden">
      {/* Upper Control Bar */}
      <div className="bg-white/[0.02] border-b border-white/5 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Account Registration</h1>
          <p className="text-xs text-muted mt-0.5 uppercase tracking-wider">Chart of Accounts & Ledger Setup</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" />
            <input placeholder="Search ledgers..." className="input pl-9 h-10 w-64 bg-white/5 border-white/10" />
          </div>
          {accounts.length === 0 && (
            <button
              onClick={handleSetupDefault}
              disabled={isSettingUp}
              className="btn-secondary flex items-center gap-2 h-10 border-primary/40 text-primary-light hover:bg-primary/10"
            >
              {isSettingUp ? (
                <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>⚡</span>
              )}
              <span>{isSettingUp ? 'Setting up...' : 'Setup Default Chart'}</span>
            </button>
          )}
          <button 
            onClick={() => {
              setFormType('ASSET');
              setFormCode(generateCode('ASSET', accounts));
              setFormGroupId('');
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2 h-10"
          >
            <Plus size={18} />
            <span>Register Account</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Hierarchical Tree */}
        <div className="w-80 border-r border-white/5 bg-white/[0.01] overflow-y-auto px-4 py-6">
          <div className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-widest mb-6 px-2">
            <FolderTree size={14} />
            <span>Account Centers</span>
          </div>
          
          <nav className="space-y-1">
            <button 
              onClick={() => setSelectedGroup(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${!selectedGroup ? 'bg-primary/20 text-white font-semibold' : 'text-muted hover:bg-white/5 hover:text-white'}`}
            >
              All Accounts
            </button>
            
            {['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'].map(type => (
              <div key={type} className="mt-4">
                <button 
                  onClick={() => setSelectedGroup(type)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${selectedGroup === type ? 'text-primary-light' : 'text-muted/60 hover:text-white'}`}
                >
                  {type}
                </button>
                <div className="ml-2 mt-1 space-y-0.5 border-l border-white/5">
                  {groups.filter(g => g.type === type).map(g => (
                    <button 
                      key={g.id}
                      onClick={() => setSelectedGroup(g.id)}
                      className={`w-full text-left px-4 py-1.5 rounded text-xs transition-all ${selectedGroup === g.id ? 'text-white bg-white/5 font-medium' : 'text-muted hover:text-white'}`}
                    >
                      • {g.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Main Content - Ledger List */}
        <div className="flex-1 overflow-y-auto bg-body/20 p-6">
          <div className="card p-0 border border-white/10 bg-white/[0.02]">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-[10px] uppercase tracking-wider text-muted/60 bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-semibold">Code</th>
                  <th className="px-6 py-4 font-semibold">Classification</th>
                  <th className="px-6 py-4 font-semibold">Ledger Name</th>
                  <th className="px-6 py-4 font-semibold text-right">Opng Bal</th>
                  <th className="px-6 py-4 font-semibold text-right">Crnt Bal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={5} className="py-20 text-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>
                ) : filteredAccounts.length === 0 ? (
                  <tr><td colSpan={5} className="py-20 text-center text-muted">No accounts found in this section.</td></tr>
                ) : (
                  filteredAccounts.map(acc => (
                    <tr key={acc.id} className="group hover:bg-white/[0.03] transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-primary-light font-bold uppercase">{acc.code}</td>
                      <td className="px-6 py-4">
                        <span className="badge-sm bg-white/10 text-white/60 group-hover:bg-white/20">{acc.type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white/90">{acc.name}</div>
                        <div className="text-[10px] text-muted flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1"><History size={10} /> Created: {acc.createdAt ? formatDate(acc.createdAt) : 'Initial'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-muted font-medium">
                        {formatCurrency(acc.openingBalance || 0)}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-white font-bold text-lg">
                        {formatCurrency(acc.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="card w-full max-w-2xl p-0 border border-white/10 shadow-[0_0_50px_-12px_rgba(37,99,235,0.4)] animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-transparent p-6 border-b border-white/10 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Register Accounting Ledger</h2>
                <p className="text-xs text-muted mt-1 uppercase tracking-widest">YBG ERP Security Core</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-muted hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form action={async (fd) => {
              setIsSubmitting(true);
              const res = await createAccount(fd);
              if (res.success) {
                toast.success('Account registered successfully');
                loadData();
                setIsModalOpen(false);
              } else toast.error(res.error);
              setIsSubmitting(false);
            }} className="p-8 space-y-6">
              {/* Hidden input for form submission */}
              <input type="hidden" name="code" value={formCode} />

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted uppercase tracking-wider">Accounting Type</label>
                <SearchableSelect
                  name="type"
                  value={formType}
                  onChange={v => {
                    setFormType(v);
                    setFormCode(generateCode(v, accounts));
                  }}
                  options={ACCOUNT_TYPE_OPTIONS}
                  placeholder="Select account type..."
                  required
                />
                {formCode && (
                  <p className="text-xs text-muted flex items-center gap-1.5 mt-1">
                    <span className="font-mono bg-primary/10 text-primary-light px-2 py-0.5 rounded-md font-semibold tracking-widest">
                      #{formCode}
                    </span>
                    <span className="opacity-60">Auto-assigned code</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted uppercase tracking-wider">Primary Designation (Name)</label>
                <input required name="name" placeholder="Name for internal records" className="input w-full bg-white/5 border-white/10" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted uppercase tracking-wider">Account Group (Parent)</label>
                  <SearchableSelect
                    name="groupId"
                    value={formGroupId || ''}
                    onChange={v => setFormGroupId(v)}
                    options={[
                      { value: '', label: 'None (Top Level)', description: 'No parent group' },
                      ...groups.map(g => ({ value: g.id, label: g.name, description: g.type }))
                    ]}
                    placeholder="Select group..."
                    createLabel="+ Create New Group"
                    onCreate={(q) => setGroupModal({ open: true, prefill: q })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted uppercase tracking-wider">Opening Balance</label>
                  <input type="number" step="0.01" name="openingBalance" defaultValue="0" className="input w-full bg-white/5 border-white/10 text-right font-mono" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted uppercase tracking-wider">Strategic Memo <span className="text-[10px] font-normal opacity-50 italic">(Optional)</span></label>
                <textarea name="description" rows={2} className="input w-full bg-white/5 border-white/10 resize-none py-3"></textarea>
              </div>

              <div className="pt-6 border-t border-white/10 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary min-w-[140px] shadow-glow">
                  {isSubmitting ? 'Syncing...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create Group Mini-Modal ── */}
      {groupModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setGroupModal({ open: false, prefill: '' })}>
          <div className="card w-full max-w-sm p-0 overflow-visible animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-primary/5 rounded-t-[20px]">
              <div>
                <h3 className="font-bold text-white text-sm">Create Account Group</h3>
                <p className="text-xs text-muted mt-0.5">Groups organise ledgers into categories</p>
              </div>
              <button onClick={() => setGroupModal({ open: false, prefill: '', type: '' })} className="text-muted hover:text-white">
                <X size={16}/>
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              const groupName = fd.get('name');
              if (!groupModal.type) {
                toast.error('Please select an Account Type for this group.');
                return;
              }
              const res = await createAccountGroup({ name: groupName, type: groupModal.type });
              if (res.success) {
                toast.success(`Group "${res.data.name}" created!`);
                const newGroups = [...groups, res.data];
                setGroups(newGroups);
                setFormGroupId(res.data.id);
                setGroupModal({ open: false, prefill: '', type: '' });
              } else {
                toast.error(res.error);
              }
            }} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Group Name *</label>
                <input name="name" required defaultValue={groupModal.prefill}
                  placeholder="e.g. Current Assets, Fixed Costs..."
                  className="input w-full" autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Linked Account Type *</label>
                <SearchableSelect
                  name="type"
                  value={groupModal.type}
                  onChange={(v) => setGroupModal(m => ({ ...m, type: v }))}
                  options={ACCOUNT_TYPE_OPTIONS}
                  placeholder="Which account type does this group belong to?"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setGroupModal({ open: false, prefill: '', type: '' })} className="btn-ghost text-sm">Cancel</button>
                <button type="submit" className="btn-primary text-sm">Create Group</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

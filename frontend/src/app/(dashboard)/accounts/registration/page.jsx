'use client';

import { useState, useEffect, useTransition } from 'react';
import { 
  Folder, FolderOpen, FileText, Search, Plus, Save, Trash2, ChevronRight, ChevronDown 
} from 'lucide-react';
import { getAccountTree, upsertAccount, deleteAccount } from '@/lib/actions/accountRegistration';
import toast from 'react-hot-toast';

const INITIAL_FORM_STATE = {
  id: '',
  name: '',
  accountCode: '',
  groupId: '',
  type: 'ASSET',
  openingBalance: 0,
  balanceType: 'DEBIT',
  isActive: true,
  description: ''
};

// Recursive Tree Node component
const TreeNode = ({ node, isGroup, onSelect, selectedId, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  if (isGroup) {
    const hasChildren = node.subGroups.length > 0 || node.accounts.length > 0;
    
    return (
      <div className="select-none">
        <div 
          className="flex items-center gap-1.5 py-1.5 px-2 hover:bg-white/5 cursor-pointer rounded-md text-white/90"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="w-4 h-4 flex items-center justify-center opacity-70">
            {hasChildren && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
          </div>
          {isOpen ? <FolderOpen size={16} className="text-amber-400" /> : <Folder size={16} className="text-amber-400" />}
          <span className="text-sm font-medium">{node.name}</span>
        </div>
        
        {isOpen && hasChildren && (
          <div className="mt-0.5">
            {node.subGroups.map(sub => (
              <TreeNode key={sub.id} node={sub} isGroup={true} onSelect={onSelect} selectedId={selectedId} level={level + 1} />
            ))}
            {node.accounts.map(acc => (
              <TreeNode key={acc.id} node={acc} isGroup={false} onSelect={onSelect} selectedId={selectedId} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Account Leaf Node
  const isSelected = selectedId === node.id;
  return (
    <div 
      className={`flex items-center gap-2 py-1.5 px-2 cursor-pointer rounded-md transition-colors ${
        isSelected ? 'bg-primary/20 text-primary-light' : 'hover:bg-white/5 text-white/70'
      }`}
      style={{ paddingLeft: `${level * 16 + 8 + 22}px` }}
      onClick={() => onSelect(node)}
    >
      <FileText size={14} className={isSelected ? 'text-primary-light' : 'text-blue-300 opacity-80'} />
      <span className="text-sm truncate">
        {node.accountCode} - {node.name}
      </span>
      {!node.isActive && <span className="ml-auto text-[10px] uppercase bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">Inactive</span>}
    </div>
  );
};

export default function AccountRegistrationPage() {
  const [treeData, setTreeData] = useState([]);
  const [unassignedAccounts, setUnassignedAccounts] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    const res = await getAccountTree();
    if (res.success) {
      setTreeData(res.data.tree);
      setUnassignedAccounts(res.data.unassignedAccounts);
      setAllGroups(res.data.allGroups);
    } else {
      toast.error('Failed to load chart of accounts');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectAccount = (account) => {
    setFormData({
      id: account.id,
      name: account.name,
      accountCode: account.accountCode,
      groupId: account.groupId || '',
      type: account.type,
      openingBalance: Math.abs(account.openingBalance || 0),
      balanceType: (account.openingBalance || 0) < 0 ? 'CREDIT' : 'DEBIT',
      isActive: account.isActive,
      description: account.description || ''
    });
  };

  const handleResetForm = () => {
    setFormData(INITIAL_FORM_STATE);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    startTransition(async () => {
      // Apply debit/credit logic to balance mathematically if needed, 
      // but let's keep openingBalance strictly positive in UI and handle signs behind the scenes if we wanted.
      // E.g., Assets/Expenses natural debit is positive. Credit is negative.
      
      const payload = {
        ...formData,
        openingBalance: formData.openingBalance
      };

      const res = await upsertAccount(payload);
      if (res.success) {
        toast.success(formData.id ? 'Account updated' : 'Account created');
        if (!formData.id) {
          setFormData(prev => ({ ...prev, id: res.data.id }));
        }
        await loadData();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleDelete = () => {
    if (!formData.id) return;
    if (!window.confirm('Are you sure you want to delete this account?')) return;
    
    startTransition(async () => {
      const res = await deleteAccount(formData.id);
      if (res.success) {
        toast.success('Account deleted');
        handleResetForm();
        await loadData();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col p-6 max-w-7xl mx-auto animate-fade-in text-white">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Account Registration</h1>
        <p className="text-muted text-sm mt-1">Manage Chart of Accounts Hierarchies and Master Ledgers</p>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        
        {/* Left Pane - Tree Explorer */}
        <div className="w-1/3 flex flex-col card p-0 border border-white/10 overflow-hidden bg-body/50 shadow-xl">
          <div className="p-4 border-b border-white/10 bg-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted h-4 w-4" />
              <input 
                type="text" 
                placeholder="Search accounts..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input w-full pl-9 bg-body border-white/10 text-sm py-2 h-9"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
            {!treeData.length && <div className="p-4 text-center text-sm text-white/40">No groups configured</div>}
            
            {treeData.map(group => (
              <TreeNode 
                key={group.id} 
                node={group} 
                isGroup={true} 
                onSelect={handleSelectAccount} 
                selectedId={formData.id} 
              />
            ))}

            {unassignedAccounts.length > 0 && (
              <div className="mt-4 pt-2 border-t border-white/10">
                <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Unassigned</div>
                {unassignedAccounts.map(acc => (
                  <TreeNode 
                    key={acc.id} 
                    node={acc} 
                    isGroup={false} 
                    onSelect={handleSelectAccount} 
                    selectedId={formData.id} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane - Form */}
        <div className="flex-1 flex flex-col card p-0 border border-white/10 shadow-xl">
          {/* Action Toolbar */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-white/5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="text-primary-light" size={20} />
              {formData.id ? 'Edit Ledger Master' : 'New Ledger Master'}
            </h2>
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                onClick={handleResetForm}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Plus size={16} /> New
              </button>
              {formData.id && (
                <button 
                  type="button" 
                  onClick={handleDelete}
                  disabled={isPending}
                  className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} /> Delete
                </button>
              )}
              <button 
                form="account-form"
                type="submit" 
                disabled={isPending}
                className="btn-primary py-2 px-6 shadow-glow flex items-center gap-2 text-sm"
              >
                <Save size={16} /> {isPending ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </div>

          {/* Form Content */}
          <form id="account-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-8">
            
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Account Code <span className="text-rose-400">*</span></label>
                <input 
                  required 
                  name="accountCode" 
                  value={formData.accountCode} 
                  onChange={handleChange}
                  className="input w-full bg-body border-white/10 focus:border-primary font-mono" 
                  placeholder="e.g. 1000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Account Name <span className="text-rose-400">*</span></label>
                <input 
                  required 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange}
                  className="input w-full bg-body border-white/10 focus:border-primary" 
                  placeholder="e.g. Cash in Hand"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Under Group</label>
                <select 
                  name="groupId" 
                  value={formData.groupId} 
                  onChange={handleChange}
                  className="input w-full bg-body border-white/10 focus:border-primary appearance-none"
                >
                  <option value="">-- Primary (Top Level) --</option>
                  {allGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.type})</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Primary Type <span className="text-muted text-xs font-normal">(if Primary)</span></label>
                <select 
                  required
                  name="type" 
                  value={formData.type} 
                  onChange={handleChange}
                  disabled={formData.groupId !== ''}
                  className="input w-full bg-body border-white/10 focus:border-primary appearance-none disabled:opacity-50"
                >
                  <option value="ASSET">Asset</option>
                  <option value="LIABILITY">Liability</option>
                  <option value="EQUITY">Equity</option>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Opening Balance</label>
                <div className="flex">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
                    <input 
                      type="number" 
                      min="0" step="0.01" 
                      name="openingBalance" 
                      value={formData.openingBalance} 
                      onChange={handleChange}
                      className="input w-full pl-8 bg-body border-white/10 focus:border-primary tabular-nums rounded-r-none border-r-0" 
                    />
                  </div>
                  <select 
                    name="balanceType" 
                    value={formData.balanceType} 
                    onChange={handleChange}
                    className="input bg-white/5 border-white/10 focus:border-primary border-l-0 rounded-l-none font-medium appearance-none w-28 text-center"
                  >
                    <option value="DEBIT">Dr</option>
                    <option value="CREDIT">Cr</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-8">
                <label className="flex items-center gap-3 cursor-pointer group w-max">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      name="isActive" 
                      checked={formData.isActive} 
                      onChange={handleChange}
                      className="peer sr-only" 
                    />
                    <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </div>
                  <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                    Account is Active
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Notes / Description</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleChange}
                rows={3}
                className="input w-full bg-body border-white/10 focus:border-primary resize-none"
                placeholder="Optional notes regarding this ledger..."
              ></textarea>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

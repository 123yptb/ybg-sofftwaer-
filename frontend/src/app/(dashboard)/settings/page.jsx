'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getOrganizationSettings, updateBusinessType, updateOrganizationSettings } from '@/lib/actions/settings';
import { BUSINESS_CONFIG } from '@/lib/context/BusinessContext';
import { Building2, Check, Save, RefreshCw, Moon, Sun } from 'lucide-react';
import toast from 'react-hot-toast';

const BUSINESS_TYPES = [
  { value: 'MANUFACTURING', icon: '🏭', label: 'Manufacturing', desc: 'Produce & sell manufactured goods', color: 'border-orange-500/40 hover:border-orange-400', activeColor: 'border-orange-400 bg-orange-500/15 shadow-[0_0_15px_rgba(249,115,22,0.2)]' },
  { value: 'SERVICE',       icon: '🛠️', label: 'Service',       desc: 'Professional services & consulting',  color: 'border-blue-500/40 hover:border-blue-400',   activeColor: 'border-blue-400 bg-blue-500/15 shadow-[0_0_15px_rgba(59,130,246,0.2)]' },
  { value: 'TRADING',       icon: '🏪', label: 'Trading',       desc: 'Buy & sell products, manage inventory', color: 'border-green-500/40 hover:border-green-400', activeColor: 'border-green-400 bg-green-500/15 shadow-[0_0_15px_rgba(34,197,94,0.2)]' },
];

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [org, setOrg]             = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [selectedType, setSelectedType] = useState('TRADING');
  const [theme, setTheme] = useState('light');
  const [form, setForm] = useState({ name: '', gstin: '', panNumber: '', address: '', phone: '', email: '', currency: 'INR', state: '' });

  const load = async () => {
    try {
      setLoading(true);
      const res = await getOrganizationSettings();
      if (res.success && res.data) {
        setOrg(res.data);
        setSelectedType(res.data.businessType || 'TRADING');
        setForm({
          name:      res.data.name      || '',
          gstin:     res.data.gstin     || '',
          panNumber: res.data.panNumber || '',
          address:   res.data.address   || '',
          phone:     res.data.phone     || '',
          email:     res.data.email     || '',
          currency:  res.data.currency  || 'INR',
          state:     res.data.state     || '',
        });
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (typeof window !== 'undefined') {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    }
    load(); 
  }, []);

  const handleThemeChange = (t) => {
    setTheme(t);
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  };

  const handleBusinessTypeChange = async (type) => {
    setSelectedType(type);
    const res = await updateBusinessType(type);
    if (res.success) {
      toast.success(`Switched to ${BUSINESS_CONFIG[type].label} mode! Please refresh.`);
      // Update session so sidebar refreshes
      await update({ businessType: type });
    } else {
      toast.error(res.error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await updateOrganizationSettings(form);
    setSaving(false);
    if (res.success) toast.success('Settings saved!');
    else toast.error(res.error);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-white/5 rounded w-48"/>
      <div className="h-40 bg-white/5 rounded-2xl"/>
      <div className="h-64 bg-white/5 rounded-2xl"/>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your organization and business preferences</p>
      </div>

      {/* ── Theme ── */}
      <div className="card p-6">
        <h2 className="font-bold text-white text-base mb-1">Appearance</h2>
        <p className="text-xs text-muted mb-4">Choose how the application looks to you</p>
        <div className="flex gap-4">
          <button
            onClick={() => handleThemeChange('light')}
            className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
              theme === 'light' ? 'border-primary bg-primary/10 shadow-glow-sm' : 'border-border bg-white/5 hover:border-white/20'
            }`}
          >
            <Sun size={20} className={theme === 'light' ? 'text-primary' : 'text-muted'} />
            <span className={`font-semibold ${theme === 'light' ? 'text-primary' : 'text-white'}`}>Bright Mode</span>
          </button>
          
          <button
            onClick={() => handleThemeChange('dark')}
            className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
              theme === 'dark' ? 'border-primary bg-primary/10 shadow-glow-sm' : 'border-border bg-white/5 hover:border-white/20'
            }`}
          >
            <Moon size={20} className={theme === 'dark' ? 'text-primary' : 'text-muted'} />
            <span className={`font-semibold ${theme === 'dark' ? 'text-primary' : 'text-white'}`}>Dark Mode</span>
          </button>
        </div>
      </div>

      {/* ── Business Type ── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-bold text-white text-base">Business Type</h2>
          <span className="text-xs text-muted ml-auto">Changes sidebar modules & invoice terminology</span>
        </div>
        <p className="text-xs text-muted mb-4">Select the face that best describes your operations</p>

        <div className="grid grid-cols-3 gap-3">
          {BUSINESS_TYPES.map(bt => (
            <button
              key={bt.value}
              onClick={() => handleBusinessTypeChange(bt.value)}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                selectedType === bt.value ? bt.activeColor : bt.color + ' bg-white/3'
              }`}>
              {selectedType === bt.value && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-success flex items-center justify-center">
                  <Check size={11} className="text-white"/>
                </div>
              )}
              <p className="text-xl mb-2">{bt.icon}</p>
              <p className="font-bold text-white text-sm">{bt.label}</p>
              <p className="text-xs text-muted mt-0.5 leading-tight">{bt.desc}</p>
            </button>
          ))}
        </div>

        {selectedType && (
          <div className="mt-4 p-3 rounded-xl bg-surface border border-border text-xs text-muted">
            <span className="font-semibold text-slate-300">Active modules: </span>
            {BUSINESS_CONFIG[selectedType].modules.join(', ')}
          </div>
        )}
      </div>

      {/* ── Organization Details ── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Building2 size={16} className="text-primary-light"/>
          <h2 className="font-bold text-white text-base">Organization Details</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group col-span-2">
              <label className="input-label">Company Name</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className="input"/>
            </div>
            <div className="input-group">
              <label className="input-label">GSTIN</label>
              <input value={form.gstin} onChange={e => set('gstin', e.target.value)}
                className="input font-mono" placeholder="27AAPFU0939F1ZV"/>
            </div>
            <div className="input-group">
              <label className="input-label">PAN Number</label>
              <input value={form.panNumber} onChange={e => set('panNumber', e.target.value)}
                className="input font-mono" placeholder="AAPFU0939F"/>
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className="input" placeholder="billing@company.com"/>
            </div>
            <div className="input-group">
              <label className="input-label">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                className="input" placeholder="+91 99999 99999"/>
            </div>
            <div className="input-group">
              <label className="input-label">State</label>
              <input value={form.state} onChange={e => set('state', e.target.value)}
                className="input" placeholder="e.g. Maharashtra"/>
            </div>
            <div className="input-group">
              <label className="input-label">Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)} className="input">
                <option value="INR">INR — Indian Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
              </select>
            </div>
            <div className="input-group col-span-2">
              <label className="input-label">Address</label>
              <textarea value={form.address} onChange={e => set('address', e.target.value)}
                className="input resize-none" rows={2} placeholder="Full business address"/>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving} className="btn-primary gap-2">
              {saving ? <RefreshCw size={14} className="animate-spin"/> : <Save size={14}/>}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

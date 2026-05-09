'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerOrganization } from '@/lib/actions/auth';
import { Building2, UserCircle2, ArrowRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const BUSINESS_TYPES = [
  {
    value: 'MANUFACTURING',
    icon: '🏭',
    label: 'Manufacturing',
    desc: 'Produce & sell manufactured goods, manage raw materials and production orders',
    color: 'border-orange-500/50 hover:border-orange-400 bg-orange-500/10',
    activeColor: 'border-orange-400 bg-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.3)]',
  },
  {
    value: 'SERVICE',
    icon: '🛠️',
    label: 'Service',
    desc: 'Deliver professional services, consulting, and project-based work',
    color: 'border-blue-500/50 hover:border-blue-400 bg-blue-500/10',
    activeColor: 'border-blue-400 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]',
  },
  {
    value: 'TRADING',
    icon: '🏪',
    label: 'Trading',
    desc: 'Buy and sell products, manage inventory and stock levels',
    color: 'border-green-500/50 hover:border-green-400 bg-green-500/10',
    activeColor: 'border-green-400 bg-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.3)]',
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep]     = useState(1); // 1: Company, 2: Business Type, 3: Admin
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    companyName:     '',
    businessType:    'TRADING',
    email:           '',
    password:        '',
    confirmPassword: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const goNext = (e) => {
    e?.preventDefault();
    if (step === 1 && !form.companyName) return toast.error('Please enter a company name');
    setStep(s => s + 1);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('companyName',  form.companyName);
      formData.append('businessType', form.businessType);
      formData.append('email',        form.email);
      formData.append('password',     form.password);

      const res = await registerOrganization(formData);
      if (res.success) {
        toast.success('Account created! Please sign in.');
        router.push('/login');
      } else {
        toast.error(res.message || 'Registration failed');
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const STEPS = ['Company', 'Business Type', 'Admin'];

  return (
    <div className="card p-8 animate-fade-in w-full max-w-md">
      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => {
          const s = i + 1;
          return (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step > s ? 'bg-success text-white'
                : step === s ? 'bg-gradient-primary text-white shadow-glow-sm'
                : 'bg-surface border border-border text-muted'
              }`}>
                {step > s ? <Check size={12}/> : s}
              </div>
              <span className={`text-xs font-medium ${step >= s ? 'text-slate-300' : 'text-muted'}`}>{label}</span>
              {s < 3 && <div className="flex-1 h-px bg-border"/>}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Company Name ── */}
      {step === 1 && (
        <form onSubmit={goNext} className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={18} className="text-primary-light"/>
            <h2 className="text-lg font-bold text-white">Company Details</h2>
          </div>
          <div className="input-group">
            <label className="input-label">Company Name</label>
            <input type="text" required value={form.companyName}
              onChange={e => set('companyName', e.target.value)}
              placeholder="e.g. Acme Industries" className="input"/>
          </div>
          <button type="submit" className="btn-primary w-full mt-2 py-3">
            Continue <ArrowRight size={16}/>
          </button>
        </form>
      )}

      {/* ── Step 2: Business Type ── */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div className="mb-1">
            <h2 className="text-lg font-bold text-white">What's your business?</h2>
            <p className="text-xs text-muted mt-1">This customises your ERP modules and terminology</p>
          </div>

          <div className="space-y-3">
            {BUSINESS_TYPES.map(bt => (
              <button
                key={bt.value}
                onClick={() => set('businessType', bt.value)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                  form.businessType === bt.value ? bt.activeColor : bt.color
                }`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none mt-0.5">{bt.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-white">{bt.label}</p>
                      {form.businessType === bt.value && (
                        <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center">
                          <Check size={11} className="text-white"/>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5">{bt.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-3 mt-2">
            <button onClick={() => setStep(1)} className="btn-secondary flex-1 py-3">Back</button>
            <button onClick={goNext} className="btn-primary flex-1 py-3">
              Continue <ArrowRight size={16}/>
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Admin Credentials ── */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <UserCircle2 size={18} className="text-primary-light"/>
            <h2 className="text-lg font-bold text-white">Admin Account</h2>
          </div>

          {/* Selected business type badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border text-xs text-muted">
            <span>{BUSINESS_TYPES.find(b => b.value === form.businessType)?.icon}</span>
            <span className="text-slate-300 font-medium">{form.companyName}</span>
            <span>·</span>
            <span>{BUSINESS_TYPES.find(b => b.value === form.businessType)?.label}</span>
          </div>

          <div className="input-group">
            <label className="input-label">Email</label>
            <input type="email" required value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="admin@company.com" className="input"/>
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input type="password" required minLength={8} value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="Min 8 characters" className="input"/>
          </div>
          <div className="input-group">
            <label className="input-label">Confirm Password</label>
            <input type="password" required value={form.confirmPassword}
              onChange={e => set('confirmPassword', e.target.value)}
              placeholder="Repeat password" className="input"/>
          </div>
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1 py-3">Back</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                : 'Create Account'}
            </button>
          </div>
        </form>
      )}

      <p className="text-center text-sm text-muted mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-primary-light hover:underline font-medium">Sign in</Link>
      </p>
    </div>
  );
}

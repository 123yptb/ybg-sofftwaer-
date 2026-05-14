'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getTrialBalance, migrateToNewYear } from '@/lib/actions/migration';
import { getAccounts } from '@/lib/actions/accounts';
import { ShieldAlert, ArrowRight, ArrowLeft, CheckCircle2, Calculator, ListTodo, Zap, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function YearEndMigrationPage() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const [trialBalance, setTrialBalance] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [orgId, setOrgId] = useState(null);
  const [manualOverrides, setManualOverrides] = useState({});

  useEffect(() => {
    if (user) {
      const id = user.tenantId || user.id;
      setOrgId(id);
      loadInitialData(id);
    }
  }, [user]);

  const loadInitialData = async (id) => {
    setLoading(true);
    const [tbRes, accRes] = await Promise.all([
      getTrialBalance(id),
      getAccounts(id)
    ]);

    if (tbRes.success) setTrialBalance(tbRes.data);
    if (accRes.success) setAccounts(accRes.data);
    setLoading(false);
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleExecute = async () => {
    setIsExecuting(true);
    const res = await migrateToNewYear(orgId, manualOverrides);
    
    if (res.success) {
      toast.success('Year-End Migration successful!');
      setStep(4); // Success step
    } else {
      toast.error(res.error);
    }
    setIsExecuting(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-muted text-sm animate-pulse">Analyzing financial records...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <Link href="/services" className="text-muted hover:text-white transition-colors text-xs flex items-center gap-2 mb-4">
          <ArrowLeft size={14} /> Back to Service Center
        </Link>
        <h1 className="text-3xl font-bold text-white tracking-tight">Year-End Migration Wizard</h1>
        <p className="text-muted mt-1 text-sm text-balance">Ensure your books are balanced and ready for a fresh start in the new financial year.</p>
      </div>

      {/* Progress Stepper */}
      <div className="flex items-center justify-between px-12 relative mb-12">
        <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-white/5 -translate-y-1/2" />
        {[1, 2, 3].map((s) => (
          <div key={s} className="relative z-10 flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
              step >= s ? 'bg-primary border-primary text-white shadow-glow-sm' : 'bg-body border-white/10 text-muted'
            }`}>
              {step > s ? <CheckCircle2 size={18} /> : <span>{s}</span>}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${step >= s ? 'text-white' : 'text-muted'}`}>
              {s === 1 ? 'Verify' : s === 2 ? 'Preview' : 'Execute'}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Verify Trial Balance */}
      {step === 1 && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="card border-white/10 bg-gradient-to-br from-white/[0.02] to-transparent p-8">
            <div className="flex items-start gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Calculator size={24} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">Trial Balance Verification</h2>
                <p className="text-muted text-sm">Every entry in the system must be balanced before closing the year.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Total Debits</span>
                <div className="text-2xl font-bold text-white tabular-nums">{formatCurrency(trialBalance?.totalDebit)}</div>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Total Credits</span>
                <div className="text-2xl font-bold text-white tabular-nums">{formatCurrency(trialBalance?.totalCredit)}</div>
              </div>
            </div>

            {trialBalance?.isBalanced ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm">
                <CheckCircle2 size={18} />
                <span>Great! Your accounts are perfectly balanced and ready for migration.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4 p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
                <div className="flex items-center gap-3 text-sm font-semibold">
                  <ShieldAlert size={20} />
                  <span>Accounts are not balanced (Difference: {formatCurrency(trialBalance?.difference)}).</span>
                </div>
                <p className="text-xs text-red-300/80 leading-relaxed">
                  Verification failed. The total debits must equal the total credits before data can be carry-forward. 
                  <strong> Please contact YBG Support to fix discrepancies.</strong>
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button 
              disabled={!trialBalance?.isBalanced}
              onClick={handleNext}
              className="btn-primary py-2.5 px-8 flex items-center gap-2 disabled:opacity-50"
            >
              Verify & Preview <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Preview Opening Balances */}
      {step === 2 && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="card p-0 overflow-hidden border-white/10">
            <div className="p-8 border-b border-white/5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <ListTodo size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Opening Balances Preview</h2>
                  <p className="text-muted text-sm">The following balances will be set as the starting figures for the new financial year.</p>
                </div>
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-muted uppercase text-[10px] font-bold sticky top-0">
                  <tr>
                    <th className="px-8 py-4">Account</th>
                    <th className="px-8 py-4">Type</th>
                    <th className="px-8 py-4 text-right">Closing Balance</th>
                    <th className="px-8 py-4 text-right text-emerald-500">New Opening</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {accounts.map(acc => (
                    <tr key={acc.id} className="hover:bg-white/[0.02]">
                      <td className="px-8 py-4 text-white font-medium">{acc.name} <span className="text-muted text-xs ml-1">({acc.code})</span></td>
                      <td className="px-8 py-4 text-muted text-xs">{acc.type}</td>
                      <td className="px-8 py-4 text-right tabular-nums text-white/50">{formatCurrency(acc.balance)}</td>
                      <td className="px-8 py-4 text-right tabular-nums font-bold text-emerald-400">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-muted/50 font-normal text-xs">$</span>
                          <input 
                            type="number"
                            className="w-24 bg-transparent text-right border-b border-white/20 hover:border-white/40 focus:border-emerald-500 outline-none tabular-nums text-emerald-400 font-bold px-1"
                            value={manualOverrides[acc.id] !== undefined ? manualOverrides[acc.id] : acc.balance}
                            onChange={(e) => setManualOverrides(prev => ({...prev, [acc.id]: e.target.value === '' ? '' : parseFloat(e.target.value)}))}
                            placeholder={acc.balance}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={handleBack} className="btn-secondary py-2.5 px-8 flex items-center gap-2">
              <ArrowLeft size={16} /> Back
            </button>
            <button onClick={handleNext} className="btn-primary py-2.5 px-8 flex items-center gap-2">
              Review Final Steps <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Execute Migration */}
      {step === 10} {/* Step 3 should be 3 */}
      {step === 3 && (
         <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="card p-12 text-center space-y-8 border-warning/10 bg-gradient-to-b from-warning/5 to-transparent">
              <div className="mx-auto w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center text-warning shadow-[0_0_40px_rgba(245,158,11,0.1)]">
                <AlertTriangle size={36} />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-white">Critical Confirmation Required</h2>
                <p className="text-muted text-sm max-w-lg mx-auto leading-relaxed">
                  Executing migration will mark all historical transactions as <strong>Archived</strong>. 
                  Active ledger balances will be set as the starting figures for the new financial year.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-black/40 border border-white/5 inline-flex flex-col gap-1">
                <span className="text-blue-400 font-mono text-xs font-bold uppercase tracking-widest">Action Summary</span>
                <p className="text-white/80 text-sm">Update {accounts.length} Accounts & Archive {trialBalance?.totalDebit > 0 ? 'active dataset' : 'all records'}</p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button onClick={handleBack} className="btn-secondary py-2.5 px-8 flex items-center gap-2">
                <ArrowLeft size={16} /> Back
              </button>
              <button 
                onClick={handleExecute}
                disabled={isExecuting}
                className="btn-danger py-4 px-12 font-bold shadow-glow-sm hover:shadow-glow transition-all flex items-center gap-3"
              >
                {isExecuting ? 'Processing Migration...' : <><Zap size={18} fill="currentColor" /> Execute Migration Now</>}
              </button>
            </div>
         </div>
      )}

      {/* Step 4: Success Message */}
      {step === 4 && (
        <div className="card text-center p-20 space-y-8 animate-in zoom-in-95 duration-500 border-emerald-500/20 bg-emerald-500/[0.02]">
          <div className="mx-auto w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-glow">
            <CheckCircle2 size={48} />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-white">Migration Complete!</h2>
            <p className="text-muted text-sm max-w-md mx-auto">
              Your books have been successfully closed and new opening balances are set. 
              The financial gateway is ready for the new year.
            </p>
          </div>
          <Link href="/dashboard" className="btn-primary inline-flex py-3 px-12">
            Return to Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}

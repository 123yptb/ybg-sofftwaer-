'use client';
import { useEffect, useState } from 'react';
import { reportsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function TrialBalancePage() {
  const now = new Date();
  const [fromDate, setFrom] = useState(`${now.getFullYear()}-01-01`);
  const [toDate,   setTo]   = useState(now.toISOString().split('T')[0]);
  const [data,     setData] = useState(null);
  const [loading,  setLoad] = useState(false);

  const fetch = () => {
    setLoad(true);
    reportsApi.trialBalance(fromDate, toDate)
      .then(r => setData(r.data))
      .catch(e => toast.error(e.message))
      .finally(() => setLoad(false));
  };
  useEffect(() => { fetch(); }, []);

  const TYPE_ORDER = ['Asset','Liability','Equity','Revenue','Expense'];
  const TYPE_COLORS = { Asset:'text-success', Liability:'text-danger', Equity:'text-primary-light', Revenue:'text-success', Expense:'text-warning' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Trial Balance</h1>
          <p className="page-subtitle">All accounts with debit/credit activity for the period</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={fromDate} onChange={e => setFrom(e.target.value)} className="input w-auto text-xs"/>
          <span className="text-muted text-sm">to</span>
          <input type="date" value={toDate}   onChange={e => setTo(e.target.value)}   className="input w-auto text-xs"/>
          <button onClick={fetch} className="btn-primary text-sm px-4 py-2">Run</button>
        </div>
      </div>

      {loading && <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"/></div>}

      {data && !loading && (
        <>
          {/* Balance indicator */}
          <div className={`card p-4 mb-6 flex items-center gap-3 ${data.totals.isBalanced ? 'border-success/30' : 'border-danger/30'}`}>
            <div className={`w-2 h-2 rounded-full ${data.totals.isBalanced ? 'bg-success' : 'bg-danger'}`}/>
            <p className="text-sm">
              {data.totals.isBalanced
                ? <span className="text-success font-medium">Balanced ✓ </span>
                : <span className="text-danger font-medium">Unbalanced ✗ </span>
              }
              <span className="text-muted">
                Total Debits: <strong className="text-slate-200">{formatCurrency(data.totals.totalPeriodDebit)}</strong>
                {' '}/ Total Credits: <strong className="text-slate-200">{formatCurrency(data.totals.totalPeriodCredit)}</strong>
              </span>
            </p>
          </div>

          <div className="card overflow-hidden">
            <div className="table-container">
              <table className="table">
                <thead><tr>
                  <th>Code</th><th>Account Name</th><th>Type</th>
                  <th className="text-right">Opening Dr</th><th className="text-right">Opening Cr</th>
                  <th className="text-right">Period Dr</th><th className="text-right">Period Cr</th>
                  <th className="text-right">Closing Balance</th>
                </tr></thead>
                <tbody>
                  {TYPE_ORDER.flatMap(type => {
                    const accounts = data.accounts.filter(a => a.account_type === type);
                    if (!accounts.length) return [];
                    return [
                      <tr key={`hdr-${type}`} className="bg-surface">
                        <td colSpan={8} className={`font-bold text-xs uppercase tracking-widest py-2 ${TYPE_COLORS[type]}`}>{type}</td>
                      </tr>,
                      ...accounts.map(a => (
                        <tr key={a.account_id}>
                          <td className="font-mono text-xs text-muted">{a.account_code}</td>
                          <td className="font-medium text-slate-200">{a.account_name}</td>
                          <td><span className={`text-xs ${TYPE_COLORS[type]}`}>{a.account_type}</span></td>
                          <td className="text-right tabular-nums text-xs">{formatCurrency(a.opening_debit)}</td>
                          <td className="text-right tabular-nums text-xs">{formatCurrency(a.opening_credit)}</td>
                          <td className="text-right tabular-nums">{formatCurrency(a.period_debit)}</td>
                          <td className="text-right tabular-nums">{formatCurrency(a.period_credit)}</td>
                          <td className={`text-right tabular-nums font-semibold ${Number(a.closing_balance) >= 0 ? 'text-slate-200' : 'text-danger'}`}>
                            {formatCurrency(Math.abs(a.closing_balance))}{Number(a.closing_balance) < 0 ? ' Cr' : ''}
                          </td>
                        </tr>
                      ))
                    ];
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

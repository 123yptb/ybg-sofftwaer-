'use client';
import { useEffect, useState } from 'react';
import { reportsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Scale, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BalanceSheetPage() {
  const [asOfDate, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data,     setData] = useState(null);
  const [loading,  setLoad] = useState(false);

  const fetch = () => {
    setLoad(true);
    reportsApi.balanceSheet(asOfDate)
      .then(r => setData(r.data))
      .catch(e => toast.error(e.message))
      .finally(() => setLoad(false));
  };
  useEffect(() => { fetch(); }, []);

  const Section = ({ title, items, total, color }) => (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-white">{title}</h3>
        <span className={`text-lg font-bold tabular-nums text-${color}-500`}>{formatCurrency(total)}</span>
      </div>
      <div className="space-y-2">
        {items.map(a => (
          <div key={a.account_code} className="flex justify-between text-sm py-1.5 border-b border-border/30">
            <span className="text-muted"><span className="font-mono text-xs mr-2">{a.account_code}</span>{a.account_name}</span>
            <span className="font-medium text-slate-200 tabular-nums">{formatCurrency(a.balance)}</span>
          </div>
        ))}
        {!items.length && <p className="text-muted text-sm">No accounts with balances</p>}
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Balance Sheet</h1>
          <p className="page-subtitle">Financial position as of a specific date</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={asOfDate} onChange={e => setDate(e.target.value)} className="input w-auto text-xs"/>
          <button onClick={fetch} className="btn-primary text-sm px-4 py-2">Run</button>
        </div>
      </div>

      {loading && <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"/></div>}

      {data && !loading && (
        <>
          {/* Balance check */}
          <div className={`card p-4 mb-6 flex items-center gap-3 ${data.check.isBalanced ? 'border-success/30' : 'border-danger/30'}`}>
            {data.check.isBalanced
              ? <CheckCircle size={18} className="text-success flex-shrink-0"/>
              : <XCircle    size={18} className="text-danger  flex-shrink-0"/>
            }
            <p className="text-sm font-medium">
              {data.check.isBalanced
                ? 'Balance sheet is balanced — Assets = Liabilities + Equity'
                : `Imbalance detected: difference of ${formatCurrency(data.check.difference)}`
              }
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Section title="Assets"      items={data.assets.accounts}      total={data.assets.total}      color="success"/>
            <Section title="Liabilities" items={data.liabilities.accounts} total={data.liabilities.total} color="danger"/>
            <Section title="Equity"      items={data.equity.accounts}      total={data.equity.total}      color="primary"/>
          </div>
        </>
      )}
    </div>
  );
}

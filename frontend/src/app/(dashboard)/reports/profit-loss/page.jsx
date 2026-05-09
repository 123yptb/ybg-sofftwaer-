'use client';
import { useEffect, useState } from 'react';
import { reportsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfitLossPage() {
  const now  = new Date();
  const [fromDate, setFrom] = useState(`${now.getFullYear()}-01-01`);
  const [toDate,   setTo]   = useState(now.toISOString().split('T')[0]);
  const [data,     setData] = useState(null);
  const [loading,  setLoad] = useState(false);

  const fetch = () => {
    setLoad(true);
    reportsApi.profitAndLoss(fromDate, toDate)
      .then(r => setData(r.data))
      .catch(e => toast.error(e.message))
      .finally(() => setLoad(false));
  };

  useEffect(() => { fetch(); }, []);

  const netProfit  = data ? Number(data.netProfit) : 0;
  const isPositive = netProfit >= 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profit &amp; Loss</h1>
          <p className="page-subtitle">Income statement for the selected period</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Net Profit Card */}
          <div className={`card p-6 flex flex-col items-center justify-center text-center ${isPositive ? 'border-success/30' : 'border-danger/30'}`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isPositive ? 'bg-success/20' : 'bg-danger/20'}`}>
              {isPositive ? <TrendingUp size={26} className="text-success"/> : <TrendingDown size={26} className="text-danger"/>}
            </div>
            <p className="text-sm text-muted mb-2">Net {isPositive ? 'Profit' : 'Loss'}</p>
            <p className={`text-4xl font-bold tabular-nums ${isPositive ? 'text-success' : 'text-danger'}`}>
              {formatCurrency(Math.abs(netProfit))}
            </p>
          </div>

          {/* Revenue */}
          <div className="card p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success"/> Revenue
              <span className="ml-auto text-success font-bold tabular-nums">{formatCurrency(data.revenue.total)}</span>
            </h3>
            <div className="space-y-2">
              {data.revenue.accounts.map(a => (
                <div key={a.account_code} className="flex justify-between text-sm">
                  <span className="text-muted">{a.account_code} {a.account_name}</span>
                  <span className="text-slate-200 font-medium tabular-nums">{formatCurrency(a.amount)}</span>
                </div>
              ))}
              {!data.revenue.accounts.length && <p className="text-muted text-sm">No revenue accounts</p>}
            </div>
          </div>

          {/* Expenses */}
          <div className="card p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-danger"/> Expenses
              <span className="ml-auto text-danger font-bold tabular-nums">{formatCurrency(data.expenses.total)}</span>
            </h3>
            <div className="space-y-2">
              {data.expenses.accounts.map(a => (
                <div key={a.account_code} className="flex justify-between text-sm">
                  <span className="text-muted">{a.account_code} {a.account_name}</span>
                  <span className="text-slate-200 font-medium tabular-nums">{formatCurrency(a.amount)}</span>
                </div>
              ))}
              {!data.expenses.accounts.length && <p className="text-muted text-sm">No expense accounts</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

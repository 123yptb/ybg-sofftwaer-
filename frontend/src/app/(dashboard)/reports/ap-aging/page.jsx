'use client';
import { useEffect, useState } from 'react';
import { reportsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

const BUCKET_ORDER  = ['Current','1-30 Days','31-60 Days','61-90 Days','90+ Days'];
const BUCKET_STYLES = {
  'Current':   'badge-success',
  '1-30 Days': 'badge-info',
  '31-60 Days':'badge-warning',
  '61-90 Days':'badge-warning',
  '90+ Days':  'badge-danger',
};

export default function APAgingPage() {
  const [data,    setData]  = useState(null);
  const [loading, setLoad]  = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [asOfDate, setDate] = useState(today);

  const fetch = () => {
    setLoad(true);
    reportsApi.apAging(asOfDate)
      .then(r => setData(r.data))
      .catch(e => toast.error(e.message))
      .finally(() => setLoad(false));
  };
  useEffect(() => { fetch(); }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AP Aging Report</h1>
          <p className="page-subtitle">Outstanding bills by age</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={asOfDate} onChange={e => setDate(e.target.value)} className="input w-auto text-xs"/>
          <button onClick={fetch} className="btn-primary text-sm px-4 py-2">Run</button>
        </div>
      </div>

      {loading && <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"/></div>}

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {BUCKET_ORDER.map(bucket => {
              const b = data.buckets[bucket];
              return (
                <div key={bucket} className="card-hover p-4 text-center">
                  <span className={`badge ${BUCKET_STYLES[bucket]} mb-2`}>{bucket}</span>
                  <p className="text-lg font-bold text-white tabular-nums mt-2">{formatCurrency(b?.total || 0)}</p>
                  <p className="text-xs text-muted">{b?.bills?.length || 0} bills</p>
                </div>
              );
            })}
          </div>
          {BUCKET_ORDER.filter(b => data.buckets[b]).map(bucket => {
            const items = data.buckets[bucket]?.bills || [];
            if (!items.length) return null;
            return (
              <div key={bucket} className="card overflow-hidden mb-4">
                <div className="px-6 py-3 border-b border-border flex items-center gap-2">
                  <span className={`badge ${BUCKET_STYLES[bucket]}`}>{bucket}</span>
                  <span className="text-sm font-semibold text-white ml-auto">{formatCurrency(data.buckets[bucket].total)}</span>
                </div>
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th>Bill #</th><th>Supplier</th><th>Due Date</th><th>Days Overdue</th><th className="text-right">Amount Due</th></tr></thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.bill_id}>
                          <td className="font-mono text-xs text-primary-light">{item.bill_number}</td>
                          <td>{item.supplier_name}</td>
                          <td className="text-muted text-xs">{item.due_date}</td>
                          <td><span className={`badge ${BUCKET_STYLES[bucket]}`}>{item.days_overdue <= 0 ? 'Current' : `${item.days_overdue}d`}</span></td>
                          <td className="text-right font-semibold tabular-nums text-warning">{formatCurrency(item.amount_due)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          <div className="card p-4 flex justify-between items-center">
            <span className="font-semibold text-slate-300">Grand Total Outstanding</span>
            <span className="text-xl font-bold text-white tabular-nums">{formatCurrency(data.grandTotal)}</span>
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { paymentsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  CheckCircle, XCircle, AlertTriangle, Search, 
  Banknote, CalendarDays, ExternalLink 
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_ICONS = {
  Pending:  <AlertTriangle size={15} className="text-warning"/>,
  Cleared:  <CheckCircle size={15} className="text-success"/>,
  Returned: <XCircle size={15} className="text-danger"/>,
};

export default function ChequeRegistryPage() {
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('Pending'); // Pending, Cleared, Returned

  const fetchCheques = () => {
    setLoading(true);
    // Note: We are listing payments with method 'Cheque'
    paymentsApi.list({ method: 'Cheque', status: status === 'All' ? undefined : status })
      .then(r => setPayments(r.data.payments))
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCheques(); }, [status]);

  const onVerify = async (id, isSuccess = true) => {
    const clearingDate = new Date().toISOString().split('T')[0];
    try {
      await paymentsApi.verify(id, { 
        clearingDate, 
        status: isSuccess ? 'Cleared' : 'Returned' 
      });
      toast.success(isSuccess ? 'Cheque verified and cleared!' : 'Cheque marked as returned/bounced');
      fetchCheques();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const filtered = payments.filter(p => 
    !search || 
    p.reference_no?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cheque Registry</h1>
          <p className="page-subtitle">Verify and clear post-dated cheques</p>
        </div>
        <div className="flex bg-surface border border-border rounded-xl p-1">
          {['Pending', 'Cleared', 'Returned'].map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${status === s ? 'bg-gradient-primary text-white shadow-glow-sm' : 'text-muted hover:text-white'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Registry Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Cheque Date</th>
                <th>Mature Date</th>
                <th>Cheque #</th>
                <th>Bank / Branch</th>
                <th>Type</th>
                <th>Entity</th>
                <th className="text-right">Amount</th>
                <th className="text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(5)].map((_,i) => <tr key={i}>{[...Array(8)].map((_,j) => <td key={j}><div className="h-4 bg-white/5 rounded animate-pulse"/></td>)}</tr>)
                : filtered.map(p => (
                  <tr key={p.id}>
                    <td className="text-xs text-muted font-medium italic">{p.cheque_date ? formatDate(p.cheque_date) : 'N/A'}</td>
                    <td>
                      <span className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
                        <CalendarDays size={13} className="text-primary-light"/>
                        {p.maturity_date ? formatDate(p.maturity_date) : 'N/A'}
                      </span>
                    </td>
                    <td className="text-xs font-mono text-primary-light font-bold">#{p.cheque_no || p.reference_no}</td>
                    <td>
                      <p className="text-sm font-medium text-slate-200 leading-none">{p.bank_name || 'N/A'}</p>
                      <p className="text-[10px] text-muted mt-1">{p.branch || 'N/A'}</p>
                    </td>
                    <td>
                       <span className={`badge text-[10px] uppercase font-bold py-0.5 ${p.type === 'Receipt' ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="text-xs text-muted"> {p.entity_type} <span className="font-mono text-[10px]">({p.entity_id.slice(0,6)})</span> </td>
                    <td className="text-right tabular-nums font-bold text-white">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="text-right pr-6">
                      {p.status === 'Pending' ? (
                        <div className="flex items-center justify-end gap-2">
                           <button onClick={() => onVerify(p.id, false)} title="Mark as Bounced/Returned"
                            className="btn-icon text-danger hover:bg-danger/10 p-1.5 border border-danger/20 rounded-lg">
                            <XCircle size={15}/>
                          </button>
                          <button onClick={() => onVerify(p.id, true)} 
                            className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 shadow-glow-sm">
                            <CheckCircle size={14}/> Verify
                          </button>
                        </div>
                      ) : (
                        <span className="badge badge-muted py-1.5">
                           {STATUS_ICONS[p.status]} {p.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              }
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-24 italic">
                    <Banknote size={40} className="mx-auto mb-3 opacity-10"/>
                    <p>No {status.toLowerCase()} cheques found in registry</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

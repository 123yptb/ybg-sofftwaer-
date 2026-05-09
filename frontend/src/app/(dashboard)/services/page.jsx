'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createServiceRequest, getServiceRequests, checkYearEndToolAccess } from '@/lib/actions/services';
import { Wrench, RefreshCcw, Database, CheckCircle2, AlertCircle, Clock, Lock, Unlock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const SERVICES = [
  {
    id: 'YEAR_END',
    title: 'Year-End Migration',
    description: 'Expert audit and closing of your financial year. Includes ledger balancing and carry-forward setup.',
    fee: 500,
    icon: <RefreshCcw className="text-blue-500" size={24} />,
    color: 'blue'
  },
  {
    id: 'DATA_IMPORT',
    title: 'Bulk Data Import',
    description: 'Import large datasets from Tally, SAP, or legacy Excel sheets with 100% data integrity check.',
    fee: 250,
    icon: <Database className="text-emerald-500" size={24} />,
    color: 'emerald'
  },
  {
    id: 'BUG_FIX',
    title: 'Custom Database Fix',
    description: 'Direct support from the YBG Team to repair corrupted databases or resolve complex reconciliation errors.',
    fee: 'Contact for Quote',
    icon: <Wrench className="text-orange-500" size={24} />,
    color: 'orange'
  }
];

export default function ServicesPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState(null);

  useEffect(() => {
    if (user?.tenantId || user?.id) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const orgId = user.tenantId || user.id;
    
    // Fetch requests and access status
    const [reqsRes, accessRes] = await Promise.all([
      getServiceRequests(orgId),
      checkYearEndToolAccess(orgId)
    ]);

    if (reqsRes.success) setRequests(reqsRes.data);
    if (accessRes.success) setIsUnlocked(accessRes.unlocked);
    
    setLoading(false);
  };

  const handleRequest = async (service) => {
    const orgId = user.tenantId || user.id;
    setRequestingId(service.id);
    
    const res = await createServiceRequest({
      type: service.id,
      feeAmount: typeof service.fee === 'number' ? service.fee : 0,
      organizationId: orgId
    });

    if (res.success) {
      toast.success(`${service.title} request submitted!`);
      loadData();
    } else {
      toast.error(res.error);
    }
    setRequestingId(null);
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Service Center</h1>
          <p className="text-muted mt-1 text-sm">Professional support and premium tools from the YBG Team.</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isUnlocked ? 'bg-emerald-500' : 'bg-white/20'}`} />
          <span className="text-xs font-medium text-white/70">
            {isUnlocked ? 'Year-End Tool Unlocked' : 'Premium Tools Locked'}
          </span>
        </div>
      </div>

      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SERVICES.map((s) => (
          <div key={s.id} className="card group hover:border-white/20 transition-all duration-300">
            <div className={`w-12 h-12 rounded-xl bg-${s.color}-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              {s.icon}
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
            <p className="text-muted text-sm leading-relaxed mb-6">
              {s.description}
            </p>
            <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
              <span className="text-white font-bold tracking-tight">
                {typeof s.fee === 'number' ? `₹${s.fee}` : s.fee}
              </span>
              <button 
                onClick={() => handleRequest(s)}
                disabled={requestingId === s.id}
                className="btn-primary py-1.5 px-4 text-xs flex items-center gap-2"
              >
                {requestingId === s.id ? (
                  <Clock size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                Request Service
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Year-End Tool Unlock Section */}
      <div className={`card overflow-hidden border-2 transition-all duration-500 ${isUnlocked ? 'border-emerald-500/30' : 'border-white/5 opacity-80'}`}>
        <div className="flex flex-col md:flex-row items-center gap-8 p-8">
          <div className={`flex-shrink-0 w-20 h-20 rounded-full flex items-center justify-center ${isUnlocked ? 'bg-emerald-500/10 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'bg-white/5 text-muted'}`}>
            {isUnlocked ? <Unlock size={32} /> : <Lock size={32} />}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl font-bold text-white mb-2">Automated Year-End Closing Tool</h2>
            <p className="text-muted text-sm mb-4 max-w-2xl">
              This powerful tool automates the process of closing accounts, verifying balances, and generating the necessary carry-forward entries for the new financial year.
            </p>
            {!isUnlocked && (
              <div className="inline-flex items-center gap-2 text-warning text-xs bg-warning/10 px-3 py-1 rounded-full border border-warning/20">
                <AlertCircle size={14} />
                Requires 'PAID' status for Year-End Migration service.
              </div>
            )}
            {isUnlocked && (
              <Link href="/services/year-end" className="btn-primary mt-2 inline-flex items-center gap-2">
                Launch Year-End Tool <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Recent Requests Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Your Service History</h2>
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto text-sm">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-muted uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Request Date</th>
                  <th className="px-6 py-4">Service Type</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted animate-pulse">Loading history...</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted">No service requests found.</td></tr>
                ) : (
                  requests.map(r => (
                    <tr key={r.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4 text-white/70">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-white">
                        {SERVICES.find(s => s.id === r.type)?.title || r.type}
                      </td>
                      <td className="px-6 py-4 text-white/70 tabular-nums">
                        ₹{r.feeAmount}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                            r.status === 'PAID' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                            r.status === 'COMPLETED' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                            'bg-orange-500/10 border-orange-500/20 text-orange-500'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

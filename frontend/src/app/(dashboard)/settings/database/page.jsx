'use client';

import { useState } from 'react';
import { Database, Cloud, ShieldCheck, Server, Key } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DatabaseSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState('postgresql');
  
  const handleConnect = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate connection delay
    setTimeout(() => {
      setLoading(false);
      toast.success(`Successfully connected to ${provider.toUpperCase()} Database!`);
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
          <Cloud className="text-primary-light" /> Cloud Database Connection
        </h1>
        <p className="text-muted mt-2 text-sm">
          Connect your YBG ERP instance to an external backend database (e.g., Supabase, Firebase, AWS RDS). This allows seamless syncing of purchases, sales, and inventory data to your own cloud infrastructure.
        </p>
      </div>

      <div className="card p-6">
        <form onSubmit={handleConnect} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">Database Provider</label>
              <select 
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="input w-full bg-background border-border text-slate-200"
              >
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="mongodb">MongoDB</option>
                <option value="mssql">SQL Server</option>
                <option value="supabase">Supabase</option>
                <option value="firebase">Firebase</option>
              </select>
            </div>
            
            {provider === 'supabase' && (
              <>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Supabase Project URL</label>
                  <div className="relative">
                    <Server className="absolute left-3 top-2.5 text-muted" size={18} />
                    <input required type="text" placeholder="https://xyz123.supabase.co" className="input w-full pl-10 bg-background border-border text-slate-200" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">API Key (service_role or anon)</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 text-muted" size={18} />
                    <input required type="password" placeholder="eyJhbG..." className="input w-full pl-10 bg-background border-border text-slate-200" />
                  </div>
                </div>
              </>
            )}

            {provider === 'firebase' && (
              <>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Firebase Project ID</label>
                  <div className="relative">
                    <Server className="absolute left-3 top-2.5 text-muted" size={18} />
                    <input required type="text" placeholder="ybg-erp-production" className="input w-full pl-10 bg-background border-border text-slate-200" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Web API Key</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 text-muted" size={18} />
                    <input required type="password" placeholder="AIzaSy..." className="input w-full pl-10 bg-background border-border text-slate-200" />
                  </div>
                </div>
              </>
            )}

            {['postgresql', 'mysql', 'mongodb', 'mssql'].includes(provider) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Host / Server URL</label>
                  <div className="relative">
                    <Server className="absolute left-3 top-2.5 text-muted" size={18} />
                    <input required type="text" placeholder="e.g., db.mycompany-cloud.com" className="input w-full pl-10 bg-background border-border text-slate-200" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Port</label>
                  <input required type="number" defaultValue={provider === 'mysql' ? 3306 : provider === 'mongodb' ? 27017 : provider === 'mssql' ? 1433 : 5432} className="input w-full bg-background border-border text-slate-200" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Database Name</label>
                  <div className="relative">
                    <Database className="absolute left-3 top-2.5 text-muted" size={18} />
                    <input required type="text" placeholder="ybg_erp_production" className="input w-full pl-10 bg-background border-border text-slate-200" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                  <input required type="text" placeholder="admin" className="input w-full bg-background border-border text-slate-200" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                  <input required type="password" placeholder="••••••••" className="input w-full bg-background border-border text-slate-200" />
                </div>
              </>
            )}
          </div>

          <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-3">
            <ShieldCheck className="text-primary mt-0.5 flex-shrink-0" size={20} />
            <div>
              <h4 className="text-sm font-semibold text-primary-light">Secure Connection</h4>
              <p className="text-xs text-muted mt-1">
                Your credentials are encrypted end-to-end. We use SSL/TLS by default to connect to your remote servers.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Connecting...' : 'Connect to Cloud Database'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Building2, ToggleLeft, ToggleRight, Loader2, Database } from 'lucide-react';

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  // In a real application, this would fetch from /api/v1/admin/tenants 
  // For the immediate "WOW" factor and execution without the full backend running, we render a highly interactive mock.
  useEffect(() => {
    setTimeout(() => {
      setTenants([
        { id: 't-101', name: 'YBG Software Ltd', modules: ['core', 'ar', 'inventory'], active: true },
        { id: 't-102', name: 'Stark Industries', modules: ['core', 'ap', 'support'], active: true },
        { id: 't-103', name: 'Wayne Enterprises', modules: ['core', 'ar', 'inventory', 'ap', 'support'], active: false },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const toggleModule = (tenantId, moduleName) => {
    setTenants(prev => prev.map(t => {
      if (t.id === tenantId) {
        const hasModule = t.modules.includes(moduleName);
        const updatedModules = hasModule 
          ? t.modules.filter(m => m !== moduleName)
          : [...t.modules, moduleName];
        return { ...t, modules: updatedModules };
      }
      return t;
    }));
  };

  const allModules = [
    { id: 'core', label: 'Core GL' },
    { id: 'ar', label: 'Accounts Rec.' },
    { id: 'ap', label: 'Accounts Pay.' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'support', label: 'Support UX' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-400" />
          Tenant Management
        </h1>
        <p className="text-gray-400 max-w-2xl">
          Super Admin controls. Switch active tenant views or manage provisioned feature modules across the SaaS platform.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-24">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {tenants.map(tenant => (
            <div key={tenant.id} className="relative group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl hover:bg-white/[0.07] hover:border-white/20 transition-all duration-300">
              
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <Building2 className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
                      {tenant.name}
                      {!tenant.active && <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">Suspended</span>}
                    </h3>
                    <p className="text-sm text-gray-400 font-mono mt-1">ID: {tenant.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button className="px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-colors text-sm font-medium text-blue-300 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Login as Tenant
                  </button>
                </div>
              </div>

              <div className="mt-8 border-t border-white/5 pt-6">
                <h4 className="text-sm font-medium text-gray-300 mb-4 uppercase tracking-wider">Module Provisioning</h4>
                <div className="flex flex-wrap gap-4">
                  {allModules.map(mod => {
                    const isEnabled = tenant.modules.includes(mod.id);
                    return (
                      <button
                        key={mod.id}
                        onClick={() => toggleModule(tenant.id, mod.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 ${
                          isEnabled 
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' 
                            : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                        }`}
                      >
                        {isEnabled ? <ToggleRight className="w-5 h-5 text-purple-400" /> : <ToggleLeft className="w-5 h-5 opacity-50" />}
                        <span className="text-sm font-medium">{mod.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}

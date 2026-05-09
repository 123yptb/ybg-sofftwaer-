'use client';

import React from 'react';
import { Users, Database, ShieldAlert, Activity } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-400" />
          YBG Super Admin Dashboard
        </h1>
        <p className="text-gray-400 max-w-2xl">
          Global overview of the YBG ERP ecosystem. Monitor tenant activity, support requests, and system health.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {/* Tenants Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl hover:bg-white/[0.07] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Database className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-2xl font-bold text-gray-200">3</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-100 mb-1">Active Tenants</h3>
          <p className="text-sm text-gray-400 mb-6">Manage multi-tenant isolation and provision modules.</p>
          <Link href="/admin/tenants" className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors">
            Manage Tenants &rarr;
          </Link>
        </div>

        {/* Support Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl hover:bg-white/[0.07] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <ShieldAlert className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-gray-200">2</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-100 mb-1">Open Tickets</h3>
          <p className="text-sm text-gray-400 mb-6">Review escalated UI and API requests from tenants.</p>
          <Link href="/admin/support-requests" className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
            View Inbox &rarr;
          </Link>
        </div>

        {/* Users Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl hover:bg-white/[0.07] transition-all opacity-70">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <span className="text-2xl font-bold text-gray-200">~</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-100 mb-1">Global Audit</h3>
          <p className="text-sm text-gray-400 mb-6">Global platform analytics and cross-tenant auditing.</p>
          <button disabled className="text-sm font-medium text-gray-500 cursor-not-allowed">
            Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
}

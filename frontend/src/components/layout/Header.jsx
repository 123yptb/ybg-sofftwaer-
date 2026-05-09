'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/lib/utils';
import { Bell as BellIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const BREADCRUMBS = {
  '/dashboard':              'Dashboard',
  '/accounts':               'Chart of Accounts',
  '/journals':               'Journal Entries',
  '/customers':              'Customers',
  '/invoices':               'Invoices',
  '/products':               'Products',
  '/raw-materials':          'Raw Materials',
  '/bom':                    'Bill of Materials',
  '/production':             'Production Orders',
  '/suppliers':              'Suppliers',
  '/bills':                  'Bills',
  '/reports/trial-balance':  'Trial Balance',
  '/reports/profit-loss':    'Profit & Loss',
  '/reports/balance-sheet':  'Balance Sheet',
  '/reports/ar-aging':       'AR Aging Report',
  '/reports/ap-aging':       'AP Aging Report',
  '/returns':                'Returns (Credit/Debit Notes)',
  '/reports/low-stock':      'Low Stock Report',
  '/reports/stock':          'Stock Report',
  '/settings':               'Settings',
  '/settings/database':      'Cloud Database Connection',
};

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const title    = BREADCRUMBS[pathname] || 'YBG ERP';

  return (
    <header className="glass border-b border-border px-6 lg:px-8 py-4 flex items-center justify-between gap-4 flex-shrink-0">
      <div className="flex items-center gap-4">
        {pathname !== '/dashboard' && (
          <Link href="/dashboard" className="btn-icon bg-surface border border-border hover:border-primary/50 text-slate-300 hover:text-white transition-colors" title="Back to Dashboard">
            <ArrowLeft size={18}/>
          </Link>
        )}
        <div>
          <h1 className="text-lg font-semibold text-white">{title}</h1>
          <p className="text-xs text-muted">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button className="btn-icon" title="Notifications">
          <BellIcon size={18}/>
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2.5 ml-2 pl-3 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-white shadow-glow-sm">
            {getInitials(user?.full_name || 'U')}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-200 leading-none">{user?.full_name}</p>
            <p className="text-xs text-muted mt-0.5">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

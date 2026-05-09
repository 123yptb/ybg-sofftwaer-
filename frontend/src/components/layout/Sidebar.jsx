'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useBusinessType } from '@/lib/context/BusinessContext';
import {
  LayoutDashboard, BookOpen, FileText, Users, ShoppingCart,
  Package, Truck, Receipt, BarChart3, TrendingUp, Scale,
  Clock, AlertCircle, LogOut, Settings, ChevronRight,
  Banknote, Wallet, Wrench, Factory, Boxes
} from 'lucide-react';

// ── Nav builder based on business type ───────────────────────────────────────
function buildNav(type) {
  const common = [
    { label: 'Overview', items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ]},
    { label: 'General Ledger', items: [
      { href: '/accounts', icon: BookOpen,  label: 'Chart of Accounts' },
      { href: '/journals', icon: FileText,  label: 'Journal Entries' },
    ]},
    { label: 'Sales (AR)', items: [
      { href: '/customers', icon: Users,        label: 'Customers' },
      { href: '/invoices',  icon: ShoppingCart, label: 'Invoices' },
      { href: '/receipts',  icon: Banknote,     label: 'Receipts' },
    ]},
    { label: 'Purchasing (AP)', items: [
      { href: '/suppliers', icon: Truck,   label: 'Suppliers' },
      { href: '/bills',     icon: Receipt, label: 'Bills' },
    ]},
    { label: 'Reports', items: [
      { href: '/reports/trial-balance', icon: BarChart3,   label: 'Trial Balance' },
      { href: '/reports/profit-loss',   icon: TrendingUp,  label: 'Profit & Loss' },
      { href: '/reports/balance-sheet', icon: Scale,       label: 'Balance Sheet' },
      { href: '/reports/ar-aging',      icon: Clock,       label: 'AR Aging' },
    ]},
  ];

  // Manufacturing — adds Production, BOM, Raw Materials; no Service Center
  if (type === 'MANUFACTURING') {
    return [
      common[0], // Overview
      common[1], // General Ledger
      common[2], // Sales AR
      { label: 'Inventory', items: [
        { href: '/products',    icon: Package,  label: 'Finished Goods' },
        { href: '/raw-materials', icon: Boxes,  label: 'Raw Materials' },
        { href: '/reports/stock', icon: BarChart3, label: 'Stock Report' },
      ]},
      { label: 'Production', items: [
        { href: '/production',  icon: Factory,  label: 'Production Orders' },
        { href: '/bom',         icon: FileText, label: 'Bill of Materials' },
      ]},
      common[3], // Purchasing AP
      common[4], // Reports
    ];
  }

  // Service — no inventory, adds Service Center
  if (type === 'SERVICE') {
    return [
      { label: 'Overview', items: [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/services',  icon: Wrench,          label: 'Service Center' },
      ]},
      common[1], // General Ledger
      common[2], // Sales AR
      common[3], // Purchasing AP
      common[4], // Reports
    ];
  }

  // Trading (default) — full inventory
  return [
    common[0], // Overview
    common[1], // General Ledger
    common[2], // Sales AR
    { label: 'Inventory', items: [
      { href: '/products', icon: Package, label: 'Products' },
      { href: '/reports/stock', icon: BarChart3, label: 'Stock Report' },
    ]},
    common[3], // Purchasing AP
    { label: 'Cash & Bank', items: [
      { href: '/payments', icon: Banknote, label: 'Payments & Receipts' },
      { href: '/cheques',  icon: Wallet,   label: 'Cheque Registry' },
    ]},
    { label: 'Reports', items: [
      { href: '/reports/trial-balance', icon: BarChart3,   label: 'Trial Balance' },
      { href: '/reports/profit-loss',   icon: TrendingUp,  label: 'Profit & Loss' },
      { href: '/reports/balance-sheet', icon: Scale,       label: 'Balance Sheet' },
      { href: '/reports/ar-aging',      icon: Clock,       label: 'AR Aging' },
      { href: '/reports/low-stock',     icon: AlertCircle, label: 'Low Stock' },
    ]},
  ];
}

// ── Business type badge in sidebar header ─────────────────────────────────────
const TYPE_BADGE = {
  MANUFACTURING: { label: 'Manufacturing', icon: '🏭', color: 'text-orange-400' },
  SERVICE:       { label: 'Service',       icon: '🛠️', color: 'text-blue-400' },
  TRADING:       { label: 'Trading',       icon: '🏪', color: 'text-green-400' },
};

export default function Sidebar() {
  const pathname  = usePathname();
  const { data: session } = useSession();
  const { type: businessType } = useBusinessType();
  const user = session?.user;

  const NAV   = buildNav(businessType);
  const badge = TYPE_BADGE[businessType] || TYPE_BADGE.TRADING;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-full glass border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-xl bg-gradient-primary shadow-glow-sm flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div className="min-w-0">
          <span className="text-sm font-bold text-white">YBG ERP</span>
          <p className={`text-[10px] font-medium ${badge.color} flex items-center gap-1`}>
            <span>{badge.icon}</span> {badge.label}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map(section => (
          <div key={section.label}>
            <p className="nav-section-title">{section.label}</p>
            {section.items.map(item => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}
                  className={isActive ? 'nav-item-active' : 'nav-item'}>
                  <item.icon size={16} className="flex-shrink-0"/>
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight size={13} className="opacity-60"/>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3 space-y-1">
        <Link href="/settings" className="nav-item">
          <Settings size={15}/> Settings
        </Link>
        <button onClick={handleSignOut} className="nav-item w-full text-left text-danger/80 hover:text-danger hover:bg-danger/10">
          <LogOut size={15}/> Sign Out
        </button>
      </div>
    </aside>
  );
}

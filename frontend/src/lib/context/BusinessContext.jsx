'use client';
import { createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';

// ── Config per business type ──────────────────────────────────────────────────
export const BUSINESS_CONFIG = {
  MANUFACTURING: {
    label:        'Manufacturing',
    icon:         '🏭',
    color:        'from-orange-500 to-amber-500',
    invoiceItems: 'Products',
    billItems:    'Materials',
    description:  'Produce and sell manufactured goods',
    modules: ['dashboard','accounts','journals','customers','invoices','receipts',
              'suppliers','bills','payments','raw-materials','production','reports'],
  },
  SERVICE: {
    label:        'Service',
    icon:         '🛠️',
    color:        'from-blue-500 to-cyan-500',
    invoiceItems: 'Services',
    billItems:    'Expenses',
    description:  'Deliver professional services & consulting',
    modules: ['dashboard','accounts','journals','customers','invoices','receipts',
              'suppliers','bills','payments','reports'],
  },
  TRADING: {
    label:        'Trading',
    icon:         '🏪',
    color:        'from-green-500 to-emerald-500',
    invoiceItems: 'Items',
    billItems:    'Items',
    description:  'Buy and sell products & inventory',
    modules: ['dashboard','accounts','journals','customers','invoices','receipts',
              'suppliers','bills','payments','products','reports'],
  },
};

const BusinessContext = createContext({ type: 'TRADING', ...BUSINESS_CONFIG.TRADING });

// initialType is passed from the server layout — always fresh from DB
export function BusinessProvider({ children, initialType = 'TRADING' }) {
  const { data: session } = useSession();

  // Server-injected value wins; fall back to JWT session; then default
  const type = initialType || session?.user?.businessType || 'TRADING';
  const config = BUSINESS_CONFIG[type] || BUSINESS_CONFIG.TRADING;

  return (
    <BusinessContext.Provider value={{ type, ...config }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinessType() {
  return useContext(BusinessContext);
}

export function useModuleEnabled(moduleName) {
  const { modules } = useContext(BusinessContext);
  return modules.includes(moduleName);
}

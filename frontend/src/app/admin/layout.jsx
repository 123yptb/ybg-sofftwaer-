import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'YBG Super Admin | YBG ERP',
};

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-gray-200 font-sans antialiased selection:bg-purple-500/30">
      
      {/* Background Orbs for Glassmorphism depth */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[30%] h-[40%] rounded-full bg-blue-900/20 blur-[100px]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 border-r border-white/5 bg-white/5 backdrop-blur-xl flex flex-col">
          <div className="p-6 border-b border-white/5">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              YBG Team
            </h2>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">Super Admin</p>
          </div>
          
          <nav className="flex-1 py-6 px-4 space-y-2">
            <Link href="/admin" className="block px-4 py-3 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors">
              Dashboard
            </Link>
            <Link href="/admin/tenants" className="block px-4 py-3 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors">
              Tenants & Modules
            </Link>
            <Link href="/admin/support-requests" className="block px-4 py-3 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors">
              Support Tickets
            </Link>
          </nav>

          <div className="p-4 border-t border-white/5">
            <Link href="/dashboard" className="flex items-center justify-center w-full py-2 px-4 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-all text-gray-300">
              Exit to App
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden">
          <header className="h-16 border-b border-white/5 bg-white/5 backdrop-blur-xl flex items-center px-8 sticky top-0 z-20">
            <h1 className="text-sm font-medium text-gray-400 tracking-wide">YBG ERP Security Perimeter</h1>
          </header>
          
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

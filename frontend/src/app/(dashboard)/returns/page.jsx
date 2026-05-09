'use client';

import { FileX, Undo2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ReturnsHubPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header mb-8">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Undo2 className="text-warning" /> Returns (Credit/Debit Notes)
          </h1>
          <p className="page-subtitle">Manage purchase and sales returns.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Sales Returns (Credit Notes) */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
              <Undo2 size={24} className="scale-x-[-1]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Sales Returns</h2>
              <p className="text-sm text-muted">Credit Notes</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm mb-6">
            Record items returned by your customers. This will generate a Credit Note, reduce Accounts Receivable, and return the items to stock.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/returns/credit-notes/new" className="btn bg-surface border border-border hover:border-danger/50 text-white w-full justify-between group flex items-center px-4 py-2 rounded-lg">
              Create Credit Note
              <ArrowRight size={16} className="text-muted group-hover:text-white transition-colors" />
            </Link>
            <Link href="/invoices" className="btn bg-surface border border-border hover:border-primary/50 text-white w-full justify-between group flex items-center px-4 py-2 rounded-lg">
              View All Credit Notes
              <ArrowRight size={16} className="text-muted group-hover:text-white transition-colors" />
            </Link>
          </div>
        </div>

        {/* Purchase Returns (Debit Notes) */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
              <Undo2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Purchase Returns</h2>
              <p className="text-sm text-muted">Debit Notes</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm mb-6">
            Record items returned to your suppliers. This will generate a Debit Note, reduce Accounts Payable, and remove the items from stock.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/returns/debit-notes/new" className="btn bg-surface border border-border hover:border-warning/50 text-white w-full justify-between group flex items-center px-4 py-2 rounded-lg">
              Create Debit Note
              <ArrowRight size={16} className="text-muted group-hover:text-white transition-colors" />
            </Link>
            <Link href="/bills" className="btn bg-surface border border-border hover:border-primary/50 text-white w-full justify-between group flex items-center px-4 py-2 rounded-lg">
              View All Debit Notes
              <ArrowRight size={16} className="text-muted group-hover:text-white transition-colors" />
            </Link>
          </div>
        </div>

      </div>
      
      <div className="mt-8 p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-3">
        <FileX className="text-primary mt-0.5 flex-shrink-0" size={20} />
        <div>
          <h4 className="text-sm font-semibold text-primary-light">Module Under Construction</h4>
          <p className="text-xs text-muted mt-1">
            Dedicated Credit Note and Debit Note generation is currently being built. For now, you can process returns using manual Journal Entries or negative invoices/bills.
          </p>
        </div>
      </div>
    </div>
  );
}

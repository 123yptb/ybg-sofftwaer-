'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getInvoiceById, updateInvoiceStatus } from '@/lib/actions/invoicesReceipts';
import { formatCurrency, formatDate, INVOICE_STATUS_STYLES } from '@/lib/utils';
import { ArrowLeft, CheckCircle, Send, Ban } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router  = useRouter();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await getInvoiceById(id);
    if (res.success) setInvoice(res.data);
    else toast.error(res.error);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleStatus = async (status) => {
    const res = await updateInvoiceStatus(id, status);
    if (res.success) { toast.success(`Invoice marked as ${status}`); load(); }
    else toast.error(res.error);
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-white/5 rounded w-48"/>
      <div className="h-64 bg-white/5 rounded-2xl"/>
    </div>
  );

  if (!invoice) return (
    <div className="text-center text-muted py-24">Invoice not found.</div>
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/invoices" className="btn-icon"><ArrowLeft size={16}/></Link>
          <div>
            <h1 className="page-title">{invoice.invoiceNumber}</h1>
            <p className="page-subtitle">Invoice for {invoice.customer.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status === 'Draft' && (
            <button onClick={() => handleStatus('Sent')} className="btn-secondary gap-2">
              <Send size={15}/> Mark as Sent
            </button>
          )}
          {invoice.status === 'Sent' && (
            <button onClick={() => handleStatus('Paid')} className="btn-primary gap-2">
              <CheckCircle size={15}/> Mark as Paid
            </button>
          )}
          {!['Paid','Void'].includes(invoice.status) && (
            <button onClick={() => handleStatus('Void')} className="btn-danger gap-2">
              <Ban size={15}/> Void
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice details */}
          <div className="card p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs text-muted mb-1">Bill To</p>
                <p className="font-bold text-white text-lg">{invoice.customer.name}</p>
                {invoice.customer.email && <p className="text-muted text-sm">{invoice.customer.email}</p>}
                {invoice.customer.phone && <p className="text-muted text-sm">{invoice.customer.phone}</p>}
                {invoice.customer.address && <p className="text-muted text-sm">{invoice.customer.address}</p>}
              </div>
              <span className={`badge ${INVOICE_STATUS_STYLES[invoice.status]} text-sm px-3 py-1`}>
                {invoice.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-surface rounded-xl border border-border">
              <div><p className="text-xs text-muted mb-1">Invoice Number</p><p className="font-mono text-primary-light font-semibold">{invoice.invoiceNumber}</p></div>
              <div><p className="text-xs text-muted mb-1">Issue Date</p><p className="text-slate-200 text-sm">{formatDate(invoice.issueDate)}</p></div>
              <div><p className="text-xs text-muted mb-1">Due Date</p><p className="text-slate-200 text-sm">{formatDate(invoice.dueDate)}</p></div>
            </div>

            {/* Line Items */}
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th className="text-center">Qty</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-center">Tax %</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map(item => (
                    <tr key={item.id}>
                      <td className="text-slate-200">{item.description}</td>
                      <td className="text-center tabular-nums">{item.quantity}</td>
                      <td className="text-right tabular-nums">{formatCurrency(item.unitPrice)}</td>
                      <td className="text-center text-muted">{item.taxRate}%</td>
                      <td className="text-right tabular-nums font-medium">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm text-muted"><span>Subtotal</span><span className="tabular-nums">{formatCurrency(invoice.subtotal)}</span></div>
                <div className="flex justify-between text-sm text-muted"><span>Tax</span><span className="tabular-nums">{formatCurrency(invoice.taxAmount)}</span></div>
                <div className="divider"/>
                <div className="flex justify-between font-bold text-white"><span>Total</span><span className="tabular-nums">{formatCurrency(invoice.totalAmount)}</span></div>
                <div className="flex justify-between text-sm text-success"><span>Amount Paid</span><span className="tabular-nums">{formatCurrency(invoice.amountPaid)}</span></div>
                <div className="flex justify-between text-sm font-semibold text-warning"><span>Amount Due</span><span className="tabular-nums">{formatCurrency(invoice.amountDue)}</span></div>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-6 p-4 bg-surface rounded-xl border border-border">
                <p className="text-xs text-muted mb-1 font-semibold uppercase tracking-wider">Notes</p>
                <p className="text-sm text-slate-300">{invoice.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Payment History */}
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-4">Payment History</h3>
            {invoice.receipts?.length === 0
              ? <p className="text-sm text-muted text-center py-4">No payments recorded yet</p>
              : invoice.receipts.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-xs font-mono text-primary-light">{r.receiptNumber}</p>
                      <p className="text-xs text-muted">{r.method} · {formatDate(r.date)}</p>
                    </div>
                    <p className="text-sm font-bold text-success">+{formatCurrency(r.amount)}</p>
                  </div>
                ))
            }
            {invoice.status !== 'Paid' && invoice.status !== 'Void' && (
              <Link href={`/receipts/new?invoiceId=${invoice.id}&customerId=${invoice.customerId}`} className="btn-primary w-full mt-4 justify-center">
                Record Payment
              </Link>
            )}
          </div>

          {/* Quick Stats */}
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-white mb-4">Summary</h3>
            <div className="flex justify-between text-sm"><span className="text-muted">Total Items</span><span className="text-white">{invoice.lineItems.length}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted">Created</span><span className="text-white">{formatDate(invoice.createdAt)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

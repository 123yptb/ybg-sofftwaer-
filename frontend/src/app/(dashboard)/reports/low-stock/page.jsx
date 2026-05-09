'use client';
import { useEffect, useState } from 'react';
import { reportsApi } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { AlertTriangle, PackageX } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LowStockPage() {
  const [data,    setData]  = useState(null);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    reportsApi.lowStock()
      .then(r => setData(r.data))
      .catch(e => toast.error(e.message))
      .finally(() => setLoad(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Low Stock Report</h1>
          <p className="page-subtitle">Products at or below their reorder level</p>
        </div>
        {data && (
          <span className={`badge ${data.count > 0 ? 'badge-danger text-sm px-4 py-2' : 'badge-success text-sm px-4 py-2'}`}>
            <AlertTriangle size={14}/> {data.count} item{data.count !== 1 ? 's' : ''} need restocking
          </span>
        )}
      </div>

      {loading && <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"/></div>}

      {data && !loading && (
        data.count === 0
          ? (
            <div className="card p-16 text-center">
              <PackageX size={48} className="mx-auto mb-4 text-success opacity-70"/>
              <h3 className="font-semibold text-white mb-1">All stocked up!</h3>
              <p className="text-muted text-sm">All products are above their reorder levels.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="table-container">
                <table className="table">
                  <thead><tr>
                    <th>SKU</th><th>Product</th><th>Category</th>
                    <th className="text-right">In Stock</th>
                    <th className="text-right">Reorder At</th>
                    <th className="text-right">Deficit</th>
                    <th className="text-right">Unit Price</th>
                  </tr></thead>
                  <tbody>
                    {data.products.map(p => (
                      <tr key={p.id}>
                        <td className="font-mono text-xs text-primary-light">{p.sku}</td>
                        <td className="font-medium text-slate-200">{p.name}</td>
                        <td className="text-muted text-xs">{p.category || '—'}</td>
                        <td className="text-right font-bold text-danger tabular-nums">
                          {formatNumber(p.quantity_on_hand, 2)} <span className="text-muted font-normal text-xs">{p.unit_of_measure}</span>
                        </td>
                        <td className="text-right text-muted tabular-nums">{formatNumber(p.reorder_level, 2)}</td>
                        <td className="text-right font-semibold text-warning tabular-nums">{formatNumber(p.stock_deficit, 2)}</td>
                        <td className="text-right tabular-nums">{formatCurrency(p.unit_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
      )}
    </div>
  );
}

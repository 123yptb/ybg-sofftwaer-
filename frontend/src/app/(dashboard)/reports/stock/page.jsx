'use client';

import { useEffect, useState } from 'react';
import { getAllInventory } from '@/lib/actions/manufacturing';
import { formatCurrency } from '@/lib/utils';
import { Package, AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StockReportPage() {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await getAllInventory();
    if (res.success) {
      setStock(res.data);
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const totalValue = stock.reduce((s, item) => s + (item.stockQuantity * item.costPrice), 0);
  const rawMaterials = stock.filter(i => i.category === 'RAW_MATERIAL');
  const finishedGoods = stock.filter(i => i.category === 'FINISHED_GOOD');
  const lowStock = stock.filter(i => i.stockQuantity <= i.minStockLevel);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Base Report</h1>
          <p className="page-subtitle">Real-time inventory valuation and levels</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-5 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <p className="text-2xl font-bold text-white">{formatCurrency(totalValue)}</p>
          <p className="text-sm text-muted mt-1">Total Stock Value</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/30">
          <p className="text-2xl font-bold text-white">{rawMaterials.length}</p>
          <p className="text-sm text-muted mt-1">Raw Materials</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/30">
          <p className="text-2xl font-bold text-white">{finishedGoods.length}</p>
          <p className="text-sm text-muted mt-1">Finished Goods</p>
        </div>
        <div className={`card p-5 bg-gradient-to-br border ${lowStock.length > 0 ? 'from-danger/20 to-danger/5 border-danger/30' : 'from-success/20 to-success/5 border-success/30'}`}>
          <p className="text-2xl font-bold text-white">{lowStock.length}</p>
          <p className="text-sm text-muted mt-1">Low Stock Alerts</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>SKU</th>
                <th>Stock Level</th>
                <th>Min Stock</th>
                <th className="text-right">Cost Price</th>
                <th className="text-right">Total Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j}><div className="h-4 bg-white/5 rounded animate-pulse"/></td>
                    ))}
                  </tr>
                ))
              ) : stock.length > 0 ? (
                stock.map(item => (
                  <tr key={item.id}>
                    <td className="font-semibold text-slate-200">{item.name}</td>
                    <td>
                      <span className={`badge text-xs px-2 py-0.5 rounded-full ${item.category === 'RAW_MATERIAL' ? 'bg-blue-500/20 text-blue-300' : item.category === 'FINISHED_GOOD' ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-500/20 text-slate-300'}`}>
                        {item.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-muted">{item.sku || '—'}</td>
                    <td className="tabular-nums font-mono">
                      {item.stockQuantity} {item.unit}
                    </td>
                    <td className="text-muted tabular-nums">
                      {item.minStockLevel} {item.unit}
                    </td>
                    <td className="tabular-nums text-right">
                      {formatCurrency(item.costPrice)}
                    </td>
                    <td className="tabular-nums font-semibold text-right text-primary-light">
                      {formatCurrency(item.stockQuantity * item.costPrice)}
                    </td>
                    <td>
                      {item.stockQuantity <= item.minStockLevel ? (
                        <span className="badge badge-danger flex items-center gap-1 w-fit"><AlertTriangle size={10}/> Low</span>
                      ) : (
                        <span className="badge badge-success w-fit">OK</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-muted">
                    <Package size={40} className="mx-auto mb-3 opacity-20"/>
                    <p>No inventory items found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { getFinishedGoods, deleteFinishedGood } from '@/lib/actions/manufacturing';
import { formatCurrency } from '@/lib/utils';
import { Package, TrendingUp, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FinishedGoodsPage() {
  const [goods, setGoods]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getFinishedGoods().then(res => {
      if (res.success) setGoods(res.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this finished product?')) return;
    const res = await deleteFinishedGood(id);
    if (res.success) {
      toast.success('Finished good deleted successfully');
      load();
    } else {
      toast.error(res.error || 'Failed to delete finished good');
    }
  };

  const totalValue = goods.reduce((s, g) => s + g.stockQuantity * g.costPrice, 0);
  const totalSaleValue = goods.reduce((s, g) => s + g.stockQuantity * g.unitPrice, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Finished Goods</h1>
          <p className="page-subtitle">Products ready for sale — created from production orders</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5 bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30">
          <p className="text-2xl font-bold text-white">{goods.length}</p>
          <p className="text-sm text-muted mt-1">Finished Products</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <p className="text-2xl font-bold text-white">{formatCurrency(totalValue)}</p>
          <p className="text-sm text-muted mt-1">Cost Value</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/30">
          <p className="text-2xl font-bold text-white">{formatCurrency(totalSaleValue)}</p>
          <p className="text-sm text-muted mt-1">Sale Value</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr><th>Product Name</th><th>SKU</th><th>Unit</th><th>Stock</th><th>Cost/Unit</th><th>Sale Price</th><th>Stock Value</th><th>Margin</th><th></th></tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(3)].map((_,i) => <tr key={i}>{[...Array(8)].map((_,j)=><td key={j}><div className="h-4 bg-white/5 rounded animate-pulse"/></td>)}</tr>)
              : goods.map(g => {
                  const margin = g.unitPrice > 0 ? ((g.unitPrice - g.costPrice) / g.unitPrice * 100).toFixed(1) : 0;
                  return (
                    <tr key={g.id}>
                      <td className="font-semibold text-slate-200">{g.name}</td>
                      <td className="font-mono text-xs text-muted">{g.sku || '—'}</td>
                      <td className="text-muted">{g.unit}</td>
                      <td className="tabular-nums font-mono">{g.stockQuantity}</td>
                      <td className="tabular-nums">{formatCurrency(g.costPrice)}</td>
                      <td className="tabular-nums font-semibold text-slate-200">{formatCurrency(g.unitPrice)}</td>
                      <td className="tabular-nums">{formatCurrency(g.stockQuantity * g.costPrice)}</td>
                      <td><span className="badge badge-success">{margin}%</span></td>
                      <td>
                        <button
                          onClick={() => handleDelete(g.id)}
                          className="btn-icon text-muted hover:text-danger"
                          title="Delete finished good"
                        >
                          <Trash2 size={14}/>
                        </button>
                      </td>
                    </tr>
                  );
                })
            }
            {!loading && goods.length === 0 && (
              <tr><td colSpan={8} className="text-center py-16 text-muted">
                <Package size={40} className="mx-auto mb-3 opacity-20"/>
                <p className="mb-2">No finished goods yet</p>
                <p className="text-xs">Complete a production order to see finished goods here</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

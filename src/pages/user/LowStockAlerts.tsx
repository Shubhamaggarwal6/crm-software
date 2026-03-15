import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AlertTriangle, Package, ArrowDown, Search } from 'lucide-react';
import { getProductStockDisplay, formatStockDisplay, formatMinStockDisplay } from '@/utils/stockDisplay';

export default function LowStockAlertsPage() {
  const { session, products } = useApp();
  const userId = session.userId;
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'stock' | 'name' | 'gap'>('gap');

  const userProducts = products.filter(p => p.userId === userId);

  const lowStockItems = userProducts
    .filter(p => p.minStock && p.minStock > 0 && p.stock <= p.minStock)
    .map(p => ({
      ...p,
      gap: (p.minStock || 0) - p.stock,
      severity: p.stock === 0 ? 'critical' : p.stock <= (p.minStock || 0) * 0.5 ? 'warning' : 'low',
    }));

  const filtered = lowStockItems.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'stock') return a.stock - b.stock;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return b.gap - a.gap;
  });

  const criticalCount = lowStockItems.filter(p => p.severity === 'critical').length;
  const warningCount = lowStockItems.filter(p => p.severity === 'warning').length;

  const hasCarton = (p: typeof lowStockItems[0]) => p.sellingUnitType !== 'loose' && (p.piecesPerCarton || 1) > 1;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" /> Low Stock Alerts
        </h1>
        <span className="text-xs text-muted-foreground">{lowStockItems.length} items below minimum</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="hero-card text-center">
          <div className="text-xs text-muted-foreground">Total Low Stock</div>
          <div className="text-xl font-display font-bold mt-1">{lowStockItems.length}</div>
        </div>
        <div className="hero-card text-center">
          <div className="text-xs text-muted-foreground">🔴 Out of Stock</div>
          <div className="text-xl font-display font-bold mt-1 text-destructive">{criticalCount}</div>
        </div>
        <div className="hero-card text-center">
          <div className="text-xs text-muted-foreground">🟡 Running Low</div>
          <div className="text-xl font-display font-bold mt-1 text-amber-600">{warningCount}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 border rounded-md text-sm bg-background" />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="border rounded-md px-2 py-2 text-sm bg-background">
          <option value="gap">Sort: Most Needed</option>
          <option value="stock">Sort: Lowest Stock</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <div className="hero-card text-center text-muted-foreground py-8">
          {userProducts.length === 0 ? 'No products added yet.' : 'All products are well stocked! 👍'}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(p => (
            <div key={p.id} className="hero-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-8 rounded-full ${p.severity === 'critical' ? 'bg-destructive' : p.severity === 'warning' ? 'bg-amber-500' : 'bg-yellow-400'}`} />
                <div>
                  <div className="font-medium text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    {p.category && <span>{p.category}</span>}
                    {p.unit && <span>• {p.unit}</span>}
                    {p.hsn && <span className="font-mono">HSN: {p.hsn}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={`text-sm font-bold ${p.severity === 'critical' ? 'text-destructive' : 'text-amber-600'}`}>
                    {hasCarton(p)
                      ? formatStockDisplay(p.stock, p.piecesPerCarton || 1, p.unit, p.cartonUnitName || 'Carton')
                      : `${p.stock} ${p.unit || 'Pcs'}`
                    }
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Min: {hasCarton(p)
                      ? formatMinStockDisplay(p.minStock || 0, p.piecesPerCarton || 1, p.unit, p.cartonUnitName || 'Carton')
                      : `${p.minStock}`
                    }
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-muted/50 rounded px-2 py-1">
                  <ArrowDown className="h-3 w-3 text-destructive" />
                  <span className="text-xs font-medium text-destructive">Need {p.gap}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

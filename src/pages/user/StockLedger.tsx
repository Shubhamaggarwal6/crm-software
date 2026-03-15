import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import DateRangePicker, { DateRange } from '@/components/DateRangePicker';
import { Search, Plus, Download } from 'lucide-react';
import * as XLSX from '@e965/xlsx';
import { formatStockDisplay, getProductStockDisplay, formatMinStockDisplay } from '@/utils/stockDisplay';

type MovementType = 'opening' | 'purchase' | 'sale' | 'return' | 'adjustment';

interface StockEntry {
  date: string;
  type: MovementType;
  description: string;
  refNo: string;
  stockIn: number;
  stockOut: number;
  balanceAfter: number;
}

export default function StockLedgerPage() {
  const { session, products, invoices, purchases, creditNotes, updateProduct } = useApp();
  const { t } = useLanguage();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjType, setAdjType] = useState<'add' | 'remove'>('add');
  const [adjQty, setAdjQty] = useState(0);
  const [adjReason, setAdjReason] = useState('Stock Count Correction');
  const [adjNotes, setAdjNotes] = useState('');
  const [viewMode, setViewMode] = useState<'ledger' | 'summary'>('ledger');

  const userProducts = products.filter(p => p.userId === session.userId);
  const userInvoices = invoices.filter(i => i.userId === session.userId);
  const userPurchases = purchases.filter(p => p.userId === session.userId);
  const userCreditNotes = creditNotes.filter(c => c.userId === session.userId);

  const selectedProduct = selectedProductId ? userProducts.find(p => p.id === selectedProductId) : null;

  const filteredProducts = userProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.hsn.includes(search)
  );

  // Helper to format qty with carton breakdown
  const fmtQty = (qty: number) => {
    if (!selectedProduct || selectedProduct.sellingUnitType === 'loose' || !selectedProduct.piecesPerCarton || selectedProduct.piecesPerCarton <= 1) {
      return `${qty} ${selectedProduct?.unit || 'Pcs'}`;
    }
    return formatStockDisplay(qty, selectedProduct.piecesPerCarton, selectedProduct.unit, selectedProduct.cartonUnitName || 'Carton');
  };

  // Build stock ledger for selected product
  const ledgerEntries = useMemo<StockEntry[]>(() => {
    if (!selectedProduct) return [];
    const entries: StockEntry[] = [];
    let balance = 0;

    const movements: { date: string; type: MovementType; desc: string; refNo: string; qty: number }[] = [];

    userInvoices.forEach(inv => {
      inv.items.forEach(item => {
        if (item.productId === selectedProduct.id) {
          movements.push({ date: inv.date, type: 'sale', desc: `Sold — ${inv.invoiceNo} — ${inv.customerName}`, refNo: inv.invoiceNo, qty: -item.qty });
        }
      });
    });

    userPurchases.forEach(pur => {
      pur.items.forEach(item => {
        if (item.productId === selectedProduct.id) {
          movements.push({ date: pur.date, type: 'purchase', desc: `Purchased — ${pur.purchaseNo} — ${pur.supplierName}`, refNo: pur.purchaseNo, qty: item.qty });
        }
      });
    });

    userCreditNotes.forEach(cn => {
      if (cn.goodsReturned) {
        cn.items.forEach(item => {
          if (item.productId === selectedProduct.id) {
            movements.push({ date: cn.date, type: 'return', desc: `Returned — ${cn.creditNoteNo}`, refNo: cn.creditNoteNo, qty: item.qty });
          }
        });
      }
    });

    movements.sort((a, b) => a.date.localeCompare(b.date));

    const netMovement = movements.reduce((s, m) => s + m.qty, 0);
    const openingStock = selectedProduct.stock - netMovement;
    balance = openingStock;

    const fromStr = dateRange.from.toISOString().split('T')[0];
    const toStr = dateRange.to.toISOString().split('T')[0];

    movements.forEach(m => {
      if (m.date >= fromStr && m.date <= toStr) {
        balance += m.qty;
        entries.push({
          date: m.date, type: m.type, description: m.desc, refNo: m.refNo,
          stockIn: m.qty > 0 ? m.qty : 0, stockOut: m.qty < 0 ? Math.abs(m.qty) : 0,
          balanceAfter: balance,
        });
      } else if (m.date < fromStr) {
        balance += m.qty;
      }
    });

    return entries;
  }, [selectedProduct, userInvoices, userPurchases, userCreditNotes, dateRange]);

  const totalIn = ledgerEntries.reduce((s, e) => s + e.stockIn, 0);
  const totalOut = ledgerEntries.reduce((s, e) => s + e.stockOut, 0);
  const openingBal = ledgerEntries.length > 0 ? ledgerEntries[0].balanceAfter - ledgerEntries[0].stockIn + ledgerEntries[0].stockOut : (selectedProduct?.stock || 0);
  const closingBal = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].balanceAfter : openingBal;

  const handleAdjustment = () => {
    if (!selectedProduct || adjQty <= 0) return;
    const newStock = adjType === 'add' ? selectedProduct.stock + adjQty : Math.max(0, selectedProduct.stock - adjQty);
    updateProduct(selectedProduct.id, { stock: newStock });
    setShowAdjust(false);
    setAdjQty(0);
  };

  const typeBadge = (type: MovementType) => {
    const styles: Record<MovementType, string> = {
      opening: 'bg-blue-100 text-blue-800', purchase: 'bg-green-100 text-green-800',
      sale: 'bg-red-100 text-red-800', return: 'bg-purple-100 text-purple-800',
      adjustment: 'bg-orange-100 text-orange-800',
    };
    const labels: Record<MovementType, string> = {
      opening: 'Opening', purchase: 'Purchase', sale: 'Sale', return: 'Return', adjustment: 'Adjustment',
    };
    return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${styles[type]}`}>{labels[type]}</span>;
  };

  const typeRowBg = (type: MovementType) => {
    const m: Record<MovementType, string> = {
      opening: 'bg-blue-50/50', purchase: 'bg-green-50/50', sale: 'bg-red-50/50',
      return: 'bg-purple-50/50', adjustment: 'bg-orange-50/50',
    };
    return m[type] || '';
  };

  // Stock summary for all products
  const stockSummary = useMemo(() => {
    return userProducts.map(p => {
      let totalPurchased = 0, totalSold = 0, totalReturned = 0;
      userPurchases.forEach(pur => pur.items.forEach(item => { if (item.productId === p.id) totalPurchased += item.qty; }));
      userInvoices.forEach(inv => inv.items.forEach(item => { if (item.productId === p.id) totalSold += item.qty; }));
      userCreditNotes.forEach(cn => { if (cn.goodsReturned) cn.items.forEach(item => { if (item.productId === p.id) totalReturned += item.qty; }); });
      const status = p.minStock && p.stock <= p.minStock ? 'Low' : 'Healthy';
      return { ...p, totalPurchased, totalSold, totalReturned, status };
    });
  }, [userProducts, userPurchases, userInvoices, userCreditNotes]);

  const handleExportSummary = () => {
    const data = stockSummary.map(p => ({
      'Product': p.name, 'HSN': p.hsn, 'Category': p.category || '', 'Unit': p.unit,
      'Unit Type': p.sellingUnitType, 'Pcs/Carton': p.piecesPerCarton || 1,
      'Total Purchased': p.totalPurchased, 'Total Sold': p.totalSold, 'Total Returned': p.totalReturned,
      'Current Stock': p.stock,
      'Stock Display': getProductStockDisplay(p),
      'Min Level': p.minStock || 0, 'Status': p.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Summary');
    XLSX.writeFile(wb, 'Stock_Summary.xlsx');
  };

  // Helper for summary table stock display
  const summaryStockDisplay = (p: typeof stockSummary[0], qty: number) => {
    if (p.sellingUnitType === 'loose' || !p.piecesPerCarton || p.piecesPerCarton <= 1) return String(qty);
    const cartons = Math.floor(qty / p.piecesPerCarton);
    const loose = qty % p.piecesPerCarton;
    if (qty === 0) return '0';
    let display = `${qty}`;
    if (cartons > 0 || loose > 0) {
      const parts: string[] = [];
      if (cartons > 0) parts.push(`${cartons} ${p.cartonUnitName || 'Ctn'}`);
      if (loose > 0) parts.push(`${loose} ${p.unit}`);
      display += ` (${parts.join(' + ')})`;
    }
    return display;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-display font-bold">📋 Stock Ledger</h1>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('ledger')} className={`text-xs px-3 py-1.5 rounded-md ${viewMode === 'ledger' ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}>Ledger</button>
          <button onClick={() => setViewMode('summary')} className={`text-xs px-3 py-1.5 rounded-md ${viewMode === 'summary' ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}>Summary</button>
        </div>
      </div>

      {viewMode === 'summary' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={handleExportSummary} className="btn-excel text-xs"><Download className="h-3.5 w-3.5" /> Export</button>
          </div>
          <div className="hero-card overflow-x-auto">
            <table className="w-full text-sm table-zebra">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="py-2 px-3">Product</th><th className="py-2 px-3">HSN</th><th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Unit</th><th className="py-2 px-3 text-right">Purchased</th>
                <th className="py-2 px-3 text-right">Sold</th><th className="py-2 px-3 text-right">Returned</th>
                <th className="py-2 px-3 text-right">Current Stock</th><th className="py-2 px-3 text-right">Min Level</th>
                <th className="py-2 px-3">Status</th>
              </tr></thead>
              <tbody>
                {stockSummary.map(p => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-accent/50 cursor-pointer" onClick={() => { setSelectedProductId(p.id); setViewMode('ledger'); }}>
                    <td className="py-2.5 px-3 font-medium">{p.name}</td>
                    <td className="py-2.5 px-3 font-mono text-xs">{p.hsn}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        p.sellingUnitType === 'carton' ? 'bg-blue-100 text-blue-700' :
                        p.sellingUnitType === 'both' ? 'bg-purple-100 text-purple-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {p.sellingUnitType === 'loose' ? p.unit : p.sellingUnitType === 'carton' ? (p.cartonUnitName || 'Carton') : `${p.unit} / ${p.cartonUnitName || 'Ctn'}`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">{p.unit}</td>
                    <td className="py-2.5 px-3 text-right text-green-600 font-medium">{p.totalPurchased ? summaryStockDisplay(p, p.totalPurchased) : '—'}</td>
                    <td className="py-2.5 px-3 text-right text-red-600 font-medium">{p.totalSold ? summaryStockDisplay(p, p.totalSold) : '—'}</td>
                    <td className="py-2.5 px-3 text-right text-purple-600 font-medium">{p.totalReturned ? summaryStockDisplay(p, p.totalReturned) : '—'}</td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      <div>{getProductStockDisplay(p)}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {p.minStock ? (p.sellingUnitType !== 'loose' && p.piecesPerCarton && p.piecesPerCarton > 1
                        ? formatMinStockDisplay(p.minStock, p.piecesPerCarton, p.unit, p.cartonUnitName || 'Carton')
                        : `${p.minStock} ${p.unit}`) : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.status === 'Low' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{p.status === 'Low' ? '🔴 Low' : '🟢 OK'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          {/* Product Selector */}
          <div className="hero-card space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={selectedProductId || ''}
                onChange={e => setSelectedProductId(e.target.value || null)}
                className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm"
              >
                <option value="">Select a product...</option>
                {filteredProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — HSN: {p.hsn} — Stock: {getProductStockDisplay(p)}</option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="flex flex-wrap gap-4 items-center">
                <div>
                  <div className="text-xs text-muted-foreground">Product</div>
                  <div className="font-medium">{selectedProduct.name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">HSN</div>
                  <div className="font-mono text-sm">{selectedProduct.hsn}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Current Stock</div>
                  <div className="text-2xl font-display font-bold">{getProductStockDisplay(selectedProduct)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Min Level</div>
                  <div className="text-sm">{selectedProduct.minStock ? (selectedProduct.sellingUnitType !== 'loose' && selectedProduct.piecesPerCarton && selectedProduct.piecesPerCarton > 1
                    ? formatMinStockDisplay(selectedProduct.minStock, selectedProduct.piecesPerCarton, selectedProduct.unit, selectedProduct.cartonUnitName || 'Carton')
                    : `${selectedProduct.minStock} ${selectedProduct.unit}`) : '0'}</div>
                </div>
                {selectedProduct.sellingUnitType !== 'loose' && selectedProduct.piecesPerCarton && selectedProduct.piecesPerCarton > 1 && (
                  <div>
                    <div className="text-xs text-muted-foreground">Packing</div>
                    <div className="text-sm">1 {selectedProduct.cartonUnitName || 'Carton'} = {selectedProduct.piecesPerCarton} {selectedProduct.unit}</div>
                  </div>
                )}
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${selectedProduct.minStock && selectedProduct.stock <= selectedProduct.minStock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                  {selectedProduct.minStock && selectedProduct.stock <= selectedProduct.minStock ? '🔴 Low Stock' : '🟢 Healthy'}
                </span>
              </div>
            )}
          </div>

          {selectedProduct && (
            <>
              {/* Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <DateRangePicker value={dateRange} onChange={setDateRange} />
                <button onClick={() => setShowAdjust(!showAdjust)} className="flex items-center gap-1 rounded-md border px-3 py-2 text-xs hover:bg-accent">
                  <Plus className="h-3.5 w-3.5" /> Manual Adjustment
                </button>
              </div>

              {/* Manual Adjustment Form */}
              {showAdjust && (
                <div className="hero-card space-y-3">
                  <h4 className="font-display font-semibold text-sm">🔧 Manual Stock Adjustment</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Type</label>
                      <select value={adjType} onChange={e => setAdjType(e.target.value as 'add' | 'remove')} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                        <option value="add">➕ Add Stock</option>
                        <option value="remove">➖ Remove Stock</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Quantity ({selectedProduct.unit})</label>
                      <input type="number" value={adjQty} onChange={e => setAdjQty(parseInt(e.target.value) || 0)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                      {selectedProduct.sellingUnitType !== 'loose' && selectedProduct.piecesPerCarton && selectedProduct.piecesPerCarton > 1 && adjQty > 0 && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          = {formatStockDisplay(adjQty, selectedProduct.piecesPerCarton, selectedProduct.unit, selectedProduct.cartonUnitName || 'Carton')}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Reason</label>
                      <select value={adjReason} onChange={e => setAdjReason(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                        {['Purchase Not in System', 'Damaged Goods', 'Stock Count Correction', 'Sample Given', 'Theft or Loss', 'Other'].map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Notes</label>
                      <input value={adjNotes} onChange={e => setAdjNotes(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAdjustment} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Save Adjustment</button>
                    <button onClick={() => setShowAdjust(false)} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
                  </div>
                </div>
              )}

              {/* Ledger Table */}
              <div className="hero-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 px-3">Date</th><th className="py-2 px-3">Description</th><th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Ref No</th><th className="py-2 px-3 text-right text-green-700">Stock In</th>
                    <th className="py-2 px-3 text-right text-red-700">Stock Out</th><th className="py-2 px-3 text-right">Balance</th>
                  </tr></thead>
                  <tbody>
                    {ledgerEntries.map((e, i) => (
                      <tr key={i} className={`border-b last:border-0 ${typeRowBg(e.type)}`}>
                        <td className="py-2 px-3 text-xs">{e.date}</td>
                        <td className="py-2 px-3 text-xs">{e.description}</td>
                        <td className="py-2 px-3">{typeBadge(e.type)}</td>
                        <td className="py-2 px-3 text-xs text-primary font-medium">{e.refNo}</td>
                        <td className="py-2 px-3 text-right font-bold text-green-700">
                          {e.stockIn ? fmtQty(e.stockIn) : ''}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-red-700">
                          {e.stockOut ? fmtQty(e.stockOut) : ''}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium">
                          {fmtQty(e.balanceAfter)}
                        </td>
                      </tr>
                    ))}
                    {ledgerEntries.length === 0 && (
                      <tr><td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">No stock movements found for this period</td></tr>
                    )}
                  </tbody>
                  {ledgerEntries.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 font-bold text-sm">
                        <td colSpan={2} className="py-2 px-3">Summary</td>
                        <td className="py-2 px-3 text-xs">Opening: {fmtQty(openingBal)}</td>
                        <td className="py-2 px-3"></td>
                        <td className="py-2 px-3 text-right text-green-700">{fmtQty(totalIn)}</td>
                        <td className="py-2 px-3 text-right text-red-700">{fmtQty(totalOut)}</td>
                        <td className="py-2 px-3 text-right">Closing: {fmtQty(closingBal)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </>
          )}

          {!selectedProduct && (
            <div className="hero-card text-center py-12">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-muted-foreground">Select a product to view its stock ledger</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, Search, Upload, Trash2, Edit2, Download, Package, Box, Layers } from 'lucide-react';
import { SellingUnitType } from '@/types';
import { getProductStockDisplay, getUnitTypeBadge } from '@/utils/stockDisplay';
import * as XLSX from '@e965/xlsx';

const UNIT_OPTIONS = ['Pcs', 'Kg', 'Gram', 'Litre', 'Meter', 'Box', 'Dozen', 'Roll', 'Set', 'Pair', 'Bottle', 'Bag', 'Bundle', 'Custom'];
const CARTON_NAME_OPTIONS = ['Carton', 'Box', 'Case', 'Dozen Pack', 'Bundle', 'Bag', 'Custom'];

interface ProductForm {
  name: string; hsn: string; category: string; brand: string; barcode: string;
  price: number; sellingPrice: number; purchasePrice: number; gstRate: number; unit: string; stock: number; minStock: number;
  sellingUnitType: SellingUnitType;
  cartonUnitName: string; piecesPerCarton: number; cartonMrp: number; cartonSellingPrice: number; cartonPurchasePrice: number; cartonBarcode: string;
  customUnit: string; customCartonName: string;
  minStockInCartons: boolean;
}

const defaultForm: ProductForm = {
  name: '', hsn: '', category: '', brand: '', barcode: '',
  price: 0, sellingPrice: 0, purchasePrice: 0, gstRate: 18, unit: 'Pcs', stock: 0, minStock: 0,
  sellingUnitType: 'loose',
  cartonUnitName: 'Carton', piecesPerCarton: 1, cartonMrp: 0, cartonSellingPrice: 0, cartonPurchasePrice: 0, cartonBarcode: '',
  customUnit: '', customCartonName: '',
  minStockInCartons: false,
};

export default function ProductsPage({ viewOnly = false }: { viewOnly?: boolean }) {
  const { session, products, addProduct, updateProduct, deleteProduct } = useApp();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addTab, setAddTab] = useState<'manual' | 'excel'>('manual');
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>({ ...defaultForm });

  const userProducts = products.filter(p => p.userId === session.userId);
  const filtered = userProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.hsn.includes(search));

  const resolvedUnit = form.unit === 'Custom' ? form.customUnit : form.unit;
  const resolvedCartonName = form.cartonUnitName === 'Custom' ? form.customCartonName : form.cartonUnitName;

  const handleAdd = () => {
    if (!form.name.trim()) return;
    const minStock = form.minStockInCartons && form.piecesPerCarton > 0
      ? form.minStock * form.piecesPerCarton
      : form.minStock;
    addProduct({
      userId: session.userId, name: form.name, hsn: form.hsn, category: form.category, brand: form.brand,
      barcode: form.barcode, price: form.price, sellingPrice: form.sellingPrice, purchasePrice: form.purchasePrice,
      gstRate: form.gstRate, unit: resolvedUnit, stock: form.stock, minStock,
      sellingUnitType: form.sellingUnitType,
      cartonUnitName: resolvedCartonName, piecesPerCarton: form.piecesPerCarton,
      cartonMrp: form.cartonMrp, cartonSellingPrice: form.cartonSellingPrice,
      cartonPurchasePrice: form.cartonPurchasePrice, cartonBarcode: form.cartonBarcode,
    });
    setShowAdd(false); setForm({ ...defaultForm });
  };

  const handleEdit = (id: string) => {
    const p = userProducts.find(x => x.id === id);
    if (p) {
      setForm({
        name: p.name, hsn: p.hsn, category: p.category || '', brand: p.brand || '', barcode: p.barcode || '',
        price: p.price, sellingPrice: p.sellingPrice || 0, purchasePrice: p.purchasePrice || 0,
        gstRate: p.gstRate, unit: p.unit, stock: p.stock, minStock: p.minStock || 0,
        sellingUnitType: p.sellingUnitType || 'loose',
        cartonUnitName: p.cartonUnitName || 'Carton', piecesPerCarton: p.piecesPerCarton || 1,
        cartonMrp: p.cartonMrp || 0, cartonSellingPrice: p.cartonSellingPrice || 0,
        cartonPurchasePrice: p.cartonPurchasePrice || 0, cartonBarcode: p.cartonBarcode || '',
        customUnit: '', customCartonName: '', minStockInCartons: false,
      });
      setEditId(id); setShowAdd(true); setAddTab('manual');
    }
  };

  const handleUpdate = () => {
    if (editId) {
      const minStock = form.minStockInCartons && form.piecesPerCarton > 0
        ? form.minStock * form.piecesPerCarton
        : form.minStock;
      updateProduct(editId, {
        name: form.name, hsn: form.hsn, category: form.category, brand: form.brand, barcode: form.barcode,
        price: form.price, sellingPrice: form.sellingPrice, purchasePrice: form.purchasePrice,
        gstRate: form.gstRate, unit: resolvedUnit, stock: form.stock, minStock,
        sellingUnitType: form.sellingUnitType,
        cartonUnitName: resolvedCartonName, piecesPerCarton: form.piecesPerCarton,
        cartonMrp: form.cartonMrp, cartonSellingPrice: form.cartonSellingPrice,
        cartonPurchasePrice: form.cartonPurchasePrice, cartonBarcode: form.cartonBarcode,
      });
      setEditId(null); setShowAdd(false); setForm({ ...defaultForm });
    }
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      rows.forEach(row => {
        addProduct({
          userId: session.userId, name: row.Name || '', hsn: String(row.HSN || ''),
          price: Number(row.Price || 0), gstRate: Number(row.GST || 18), unit: row.Unit || 'Pcs',
          stock: Number(row.Stock || 0), minStock: Number(row.MinStock || 0),
          sellingUnitType: (row.SellingUnitType as SellingUnitType) || 'loose',
          piecesPerCarton: Number(row.PiecesPerCarton || 1),
        });
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = () => {
    const template = [{ Name: 'LED Bulb', HSN: '8539', Category: 'Electrical', Price: 85, PurchasePrice: 55, GST: 12, Unit: 'Pcs', Stock: 100, MinStock: 10, SellingUnitType: 'loose', PiecesPerCarton: 1 }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'Product_Template.xlsx');
  };

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) { deleteProduct(id); setConfirmDeleteId(null); }
    else setConfirmDeleteId(id);
  };

  const showLoose = form.sellingUnitType === 'loose' || form.sellingUnitType === 'both';
  const showCarton = form.sellingUnitType === 'carton' || form.sellingUnitType === 'both';

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-display font-bold">{t('nav.products')}</h1>
        {!viewOnly && (
          <button onClick={() => { setShowAdd(!showAdd); setEditId(null); setForm({ ...defaultForm }); }} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">
            <Plus className="h-3.5 w-3.5" />{isMobile ? t('action.add') : t('nav.products')}
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('action.search')} className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm" />
      </div>

      {showAdd && !viewOnly && (
        <div className="hero-card space-y-4">
          <div className="flex gap-2 border-b pb-2">
            <button onClick={() => setAddTab('manual')} className={`px-3 py-1.5 text-xs rounded-md ${addTab === 'manual' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>✏️ Manual</button>
            {!editId && <button onClick={() => setAddTab('excel')} className={`px-3 py-1.5 text-xs rounded-md ${addTab === 'excel' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>📊 Excel</button>}
          </div>

          {addTab === 'manual' ? (
            <div className="space-y-4">
              {/* Product Info */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">📦 Product Info</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><label className="text-xs text-muted-foreground">{t('form.name')} <span className="text-destructive">*</span></label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-muted-foreground">{t('form.hsn')}</label><input value={form.hsn} onChange={e => setForm(p => ({ ...p, hsn: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-muted-foreground">{t('form.category')}</label><input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-muted-foreground">Brand</label><input value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                </div>
              </div>

              {/* Packaging & Units Section */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">📦 Packaging & Units — How do you sell this product?</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Loose Only Card */}
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, sellingUnitType: 'loose' }))}
                    className={`relative p-4 rounded-lg border-2 text-left transition-all ${form.sellingUnitType === 'loose' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-muted-foreground/30'}`}
                  >
                    <Package className={`h-6 w-6 mb-2 ${form.sellingUnitType === 'loose' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="font-medium text-sm">Loose Only</div>
                    <div className="text-[11px] text-muted-foreground mt-1">Sold by individual pieces, kg, meters etc.</div>
                    {form.sellingUnitType === 'loose' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />}
                  </button>

                  {/* Carton Only Card */}
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, sellingUnitType: 'carton' }))}
                    className={`relative p-4 rounded-lg border-2 text-left transition-all ${form.sellingUnitType === 'carton' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-muted-foreground/30'}`}
                  >
                    <Box className={`h-6 w-6 mb-2 ${form.sellingUnitType === 'carton' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="font-medium text-sm">Carton Only</div>
                    <div className="text-[11px] text-muted-foreground mt-1">Sold only in full cartons or boxes</div>
                    {form.sellingUnitType === 'carton' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />}
                  </button>

                  {/* Both Card */}
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, sellingUnitType: 'both' }))}
                    className={`relative p-4 rounded-lg border-2 text-left transition-all ${form.sellingUnitType === 'both' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-muted-foreground/30'}`}
                  >
                    <Layers className={`h-6 w-6 mb-2 ${form.sellingUnitType === 'both' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="font-medium text-sm">Both Carton & Loose</div>
                    <div className="text-[11px] text-muted-foreground mt-1">Can sell either as full carton or individual pieces</div>
                    {form.sellingUnitType === 'both' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />}
                  </button>
                </div>
              </div>

              {/* Loose Unit Fields */}
              {showLoose && (
                <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground">📏 Loose Unit Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">{t('form.unit')}</label>
                      <select value={UNIT_OPTIONS.includes(form.unit) ? form.unit : 'Custom'} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                        {UNIT_OPTIONS.map(u => <option key={u}>{u}</option>)}
                        <option value="Custom">+ Custom</option>
                      </select>
                      {(!UNIT_OPTIONS.includes(form.unit) || form.unit === 'Custom') && (
                        <input placeholder="Custom unit..." value={form.customUnit} onChange={e => setForm(p => ({ ...p, customUnit: e.target.value, unit: 'Custom' }))} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-xs" />
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Loose MRP ₹</label>
                      <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Loose Selling ₹</label>
                      <input type="number" value={form.sellingPrice} onChange={e => setForm(p => ({ ...p, sellingPrice: parseFloat(e.target.value) || 0 }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                      {form.sellingPrice > 0 && form.price > 0 && form.sellingPrice < form.price && (
                        <div className="text-[10px] text-green-600 mt-0.5">Discount {((1 - form.sellingPrice / form.price) * 100).toFixed(1)}% from MRP</div>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Loose Purchase ₹</label>
                      <input type="number" value={form.purchasePrice} onChange={e => setForm(p => ({ ...p, purchasePrice: parseFloat(e.target.value) || 0 }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Barcode/SKU (Loose)</label>
                      <input value={form.barcode} onChange={e => setForm(p => ({ ...p, barcode: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {/* Carton Unit Fields */}
              {showCarton && (
                <div className="rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-400">📦 Carton Unit Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Carton Name</label>
                      <select value={CARTON_NAME_OPTIONS.includes(form.cartonUnitName) ? form.cartonUnitName : 'Custom'} onChange={e => setForm(p => ({ ...p, cartonUnitName: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                        {CARTON_NAME_OPTIONS.map(n => <option key={n}>{n}</option>)}
                        <option value="Custom">+ Custom</option>
                      </select>
                      {(!CARTON_NAME_OPTIONS.includes(form.cartonUnitName) || form.cartonUnitName === 'Custom') && (
                        <input placeholder="Custom name..." value={form.customCartonName} onChange={e => setForm(p => ({ ...p, customCartonName: e.target.value, cartonUnitName: 'Custom' }))} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-xs" />
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Pieces Per Carton <span className="text-destructive">*</span></label>
                      <input type="number" min="1" value={form.piecesPerCarton} onChange={e => setForm(p => ({ ...p, piecesPerCarton: parseInt(e.target.value) || 1 }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                      <div className="text-[10px] text-blue-600 mt-0.5">1 {resolvedCartonName} = {form.piecesPerCarton} {resolvedUnit}</div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Carton MRP ₹</label>
                      <input type="number" value={form.cartonMrp} onChange={e => setForm(p => ({ ...p, cartonMrp: parseFloat(e.target.value) || 0 }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Carton Selling ₹</label>
                      <input type="number" value={form.cartonSellingPrice} onChange={e => setForm(p => ({ ...p, cartonSellingPrice: parseFloat(e.target.value) || 0 }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                      {form.cartonSellingPrice > 0 && form.piecesPerCarton > 0 && (
                        <div className="text-[10px] text-blue-600 mt-0.5">Per Piece: ₹{(form.cartonSellingPrice / form.piecesPerCarton).toFixed(2)}</div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Carton Purchase ₹</label>
                      <input type="number" value={form.cartonPurchasePrice} onChange={e => setForm(p => ({ ...p, cartonPurchasePrice: parseFloat(e.target.value) || 0 }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                      {form.cartonPurchasePrice > 0 && form.piecesPerCarton > 0 && (
                        <div className="text-[10px] text-blue-600 mt-0.5">Per Piece Cost: ₹{(form.cartonPurchasePrice / form.piecesPerCarton).toFixed(2)}</div>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Carton Barcode/SKU</label>
                      <input value={form.cartonBarcode} onChange={e => setForm(p => ({ ...p, cartonBarcode: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {/* If carton only - still need loose unit for base tracking */}
              {form.sellingUnitType === 'carton' && (
                <div className="rounded-lg bg-muted/30 p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Base Unit (for stock tracking)</label>
                      <select value={UNIT_OPTIONS.includes(form.unit) ? form.unit : 'Custom'} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                        {UNIT_OPTIONS.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing (for carton-only, skip loose prices shown above) */}
              {form.sellingUnitType === 'carton' && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">💰 Pricing</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div><label className="text-xs text-muted-foreground">GST %</label>
                      <select value={form.gstRate} onChange={e => setForm(p => ({ ...p, gstRate: parseFloat(e.target.value) }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                        {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing for loose/both */}
              {form.sellingUnitType !== 'carton' && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">💰 Pricing</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div><label className="text-xs text-muted-foreground">GST %</label>
                      <select value={form.gstRate} onChange={e => setForm(p => ({ ...p, gstRate: parseFloat(e.target.value) }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                        {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Stock */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">📋 Stock (always in {resolvedUnit})</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Current Stock ({resolvedUnit})</label>
                    <input type="number" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: parseInt(e.target.value) || 0 }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                    {showCarton && form.piecesPerCarton > 1 && form.stock > 0 && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        = {Math.floor(form.stock / form.piecesPerCarton)} {resolvedCartonName}s + {form.stock % form.piecesPerCarton} Loose
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Min Stock Alert</label>
                    {showCarton && (
                      <div className="flex items-center gap-2 mt-1 mb-1">
                        <button type="button" onClick={() => setForm(p => ({ ...p, minStockInCartons: false }))} className={`text-[10px] px-2 py-0.5 rounded-full ${!form.minStockInCartons ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          In {resolvedUnit}
                        </button>
                        <button type="button" onClick={() => setForm(p => ({ ...p, minStockInCartons: true }))} className={`text-[10px] px-2 py-0.5 rounded-full ${form.minStockInCartons ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          In {resolvedCartonName}s
                        </button>
                      </div>
                    )}
                    <input type="number" value={form.minStock} onChange={e => setForm(p => ({ ...p, minStock: parseInt(e.target.value) || 0 }))} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
                    {form.minStockInCartons && form.piecesPerCarton > 0 && form.minStock > 0 && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">= {form.minStock * form.piecesPerCarton} {resolvedUnit} stored</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={editId ? handleUpdate : handleAdd} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">{editId ? t('action.edit') : t('action.save')}</button>
                <button onClick={() => { setShowAdd(false); setEditId(null); }} className="rounded-md border px-4 py-2 text-sm">{t('action.cancel')}</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={handleDownloadTemplate} className="btn-excel text-xs"><Download className="h-3.5 w-3.5" /> {t('action.downloadTemplate')}</button>
              <div className="border-2 border-dashed rounded-md p-8 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">Drag & Drop or</p>
                <label className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground cursor-pointer">
                  Browse Files
                  <input type="file" accept=".xlsx,.xls" onChange={handleBulkUpload} className="hidden" />
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {isMobile ? (
        <div className="space-y-2">
          {filtered.map(p => {
            const badge = getUnitTypeBadge(p);
            return (
              <div key={p.id} className="mobile-card">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-sm">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      HSN: {p.hsn} · <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.className}`}>{badge.label}</span>
                      {p.category ? ` · ${p.category}` : ''}
                    </div>
                  </div>
                  <div className="text-right"><div className="font-mono text-sm">₹{p.price}</div><div className="text-xs text-muted-foreground">{p.gstRate}% GST</div></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-medium ${p.minStock && p.stock <= p.minStock ? 'text-destructive' : 'text-success'}`}>
                    {getProductStockDisplay(p)}
                  </span>
                  {!viewOnly && (
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(p.id)} className="text-xs text-primary">{t('action.edit')}</button>
                      <button onClick={() => handleDelete(p.id)} className="text-xs text-destructive">{confirmDeleteId === p.id ? t('action.confirm') + '?' : t('action.delete')}</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="hero-card text-center py-8"><div className="text-4xl mb-2">📦</div><p className="text-sm text-muted-foreground">{t('misc.noData')}</p></div>}
        </div>
      ) : (
        <div className="hero-card overflow-x-auto">
          <table className="w-full text-sm table-zebra">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="py-2 px-3">Product</th><th className="py-2 px-3">{t('form.hsn')}</th><th className="py-2 px-3">{t('form.price')}</th><th className="py-2 px-3">GST</th><th className="py-2 px-3">Unit Type</th><th className="py-2 px-3">{t('form.stock')}</th>
              {!viewOnly && <th className="py-2 px-3">Actions</th>}
            </tr></thead>
            <tbody>
              {filtered.map(p => {
                const badge = getUnitTypeBadge(p);
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-accent/50">
                    <td className="py-2.5 px-3"><div className="font-medium">{p.name}</div>{p.category && <div className="text-xs text-muted-foreground">{p.category}</div>}</td>
                    <td className="py-2.5 px-3 font-mono text-xs">{p.hsn}</td>
                    <td className="py-2.5 px-3 font-mono">₹{p.price}{p.sellingUnitType !== 'loose' && p.cartonSellingPrice ? <div className="text-[10px] text-blue-600">Ctn: ₹{p.cartonSellingPrice}</div> : null}</td>
                    <td className="py-2.5 px-3">{p.gstRate}%</td>
                    <td className="py-2.5 px-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.className}`}>{badge.label}</span></td>
                    <td className={`py-2.5 px-3 font-medium ${p.minStock && p.stock <= p.minStock ? 'text-destructive' : ''}`}>
                      {getProductStockDisplay(p)}
                    </td>
                    {!viewOnly && (
                      <td className="py-2.5 px-3 flex gap-1">
                        <button onClick={() => handleEdit(p.id)} className="p-1 rounded hover:bg-accent"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-8"><div className="text-4xl mb-2">📦</div><p className="text-sm text-muted-foreground">{t('misc.noData')}</p></div>}
        </div>
      )}
    </div>
  );
}

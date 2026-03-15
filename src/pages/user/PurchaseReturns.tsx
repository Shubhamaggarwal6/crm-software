import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, RotateCcw, Search, Eye, Download } from 'lucide-react';
import { exportToExcel } from '@/services/exportService';
import { formatStockDisplay } from '@/utils/stockDisplay';

interface PurchaseReturn {
  id: string;
  returnNo: string;
  returnDate: string;
  purchaseId: string;
  supplierName: string;
  reason: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  debitNoteId: string | null;
  notes: string;
  items: ReturnItem[];
}

interface ReturnItem {
  productId: string;
  productName: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number;
  gstRate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  selectedUnit?: string;
  piecesPerCarton?: number;
  cartonUnitName?: string;
}

export default function PurchaseReturnsPage() {
  const { session, purchases, suppliers, products, addDebitNote, updateProduct } = useApp();
  const userId = session.userId;
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewReturn, setViewReturn] = useState<PurchaseReturn | null>(null);
  const [search, setSearch] = useState('');

  // Form
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [reason, setReason] = useState('Defective Goods');
  const [restockItems, setRestockItems] = useState(true);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ReturnItem[]>([]);

  useEffect(() => { loadReturns(); }, [userId]);

  const loadReturns = async () => {
    setLoading(true);
    const { data: rows } = await (supabase as any).from('purchase_returns').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (!rows) { setLoading(false); setReturns([]); return; }
    const { data: itemRows } = await (supabase as any).from('purchase_return_items').select('*').eq('user_id', userId);
    const itemMap: Record<string, ReturnItem[]> = {};
    (itemRows || []).forEach((r: any) => {
      if (!itemMap[r.return_id]) itemMap[r.return_id] = [];
      itemMap[r.return_id].push({
        productId: r.product_id || '', productName: r.product_name, hsnCode: r.hsn_code || '',
        quantity: r.quantity, unit: r.unit || 'Pcs', rate: r.rate || 0, gstRate: r.gst_rate || 0,
        taxableAmount: r.taxable_amount || 0, cgst: r.cgst_amount || 0, sgst: r.sgst_amount || 0,
        igst: r.igst_amount || 0, totalAmount: r.total_amount || 0,
      });
    });
    setReturns(rows.map((r: any) => ({
      id: r.id, returnNo: r.return_no, returnDate: r.return_date,
      purchaseId: r.original_purchase_id || '', supplierName: r.supplier_name || '',
      reason: r.reason || '', subtotal: r.subtotal || 0, taxTotal: r.tax_total || 0,
      total: r.total || 0, debitNoteId: r.debit_note_id,
      notes: r.notes || '', items: itemMap[r.id] || [],
    })));
    setLoading(false);
  };

  const selectedPurchase = purchases.find(p => p.id === selectedPurchaseId);

  const onSelectPurchase = (purId: string) => {
    setSelectedPurchaseId(purId);
    const pur = purchases.find(p => p.id === purId);
    if (pur) {
      setItems(pur.items.map(it => {
        const prod = products.find(p => p.id === it.productId);
        const selectedUnit = it.selectedUnit || 'loose';
        const piecesPerCarton = it.piecesPerCarton || prod?.piecesPerCarton || 1;
        const cartonUnitName = it.cartonUnitName || prod?.cartonUnitName || 'Carton';
        const displayUnit = selectedUnit === 'carton' ? cartonUnitName : it.unit;
        return {
          productId: it.productId, productName: it.productName, hsnCode: it.hsn,
          quantity: it.qty, unit: displayUnit, rate: it.purchaseRate, gstRate: it.gstRate,
          taxableAmount: it.taxableAmount, cgst: it.cgst, sgst: it.sgst, igst: it.igst,
          totalAmount: it.total,
          selectedUnit, piecesPerCarton, cartonUnitName,
        };
      }));
    }
  };

  const updateItemQty = (idx: number, qty: number) => {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[idx], quantity: qty };
      item.taxableAmount = qty * item.rate;
      const halfGst = item.taxableAmount * item.gstRate / 200;
      item.cgst = halfGst; item.sgst = halfGst; item.igst = 0;
      if (selectedPurchase?.isInterState) { item.igst = item.taxableAmount * item.gstRate / 100; item.cgst = 0; item.sgst = 0; }
      item.totalAmount = item.taxableAmount + item.cgst + item.sgst + item.igst;
      updated[idx] = item;
      return updated;
    });
  };

  const removeItem = (idx: number) => items.length > 1 && setItems(prev => prev.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + i.taxableAmount, 0);
  const taxTotal = items.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0);
  const total = subtotal + taxTotal;

  const saveReturn = async () => {
    if (!selectedPurchaseId) { toast.error('Select a purchase'); return; }
    if (items.length === 0) { toast.error('No items'); return; }

    const year = new Date().getFullYear();
    const count = returns.filter(r => r.returnNo?.startsWith(`PR-${year}`)).length;
    const returnNo = `PR-${year}-${String(count + 1).padStart(4, '0')}`;

    const supplier = suppliers.find(s => s.id === selectedPurchase?.supplierId);

    const { data, error } = await (supabase as any).from('purchase_returns').insert({
      return_no: returnNo, user_id: userId, return_date: returnDate,
      original_purchase_id: selectedPurchaseId,
      supplier_id: selectedPurchase?.supplierId || null,
      supplier_name: selectedPurchase?.supplierName || '',
      reason, subtotal, tax_total: taxTotal, total, notes,
    }).select().single();

    if (error) { toast.error('Save failed: ' + error.message); return; }

    await (supabase as any).from('purchase_return_items').insert(items.map(i => ({
      return_id: data.id, user_id: userId, product_id: i.productId || null,
      product_name: i.productName, hsn_code: i.hsnCode, quantity: i.quantity,
      unit: i.unit, rate: i.rate, gst_rate: i.gstRate, taxable_amount: i.taxableAmount,
      cgst_amount: i.cgst, sgst_amount: i.sgst, igst_amount: i.igst, total_amount: i.totalAmount,
    })));

    // Reduce stock (returning to supplier = stock decrease, convert carton qty to loose)
    if (restockItems) {
      for (const item of items) {
        if (item.productId) {
          const prod = products.find(p => p.id === item.productId);
          if (prod) {
            const looseQty = item.selectedUnit === 'carton' && item.piecesPerCarton
              ? item.quantity * item.piecesPerCarton
              : item.quantity;
            const newStock = Math.max(0, prod.stock - looseQty);
            await (supabase as any).from('products').update({ current_stock: newStock }).eq('id', item.productId);
            updateProduct(item.productId, { stock: newStock });
          }
        }
      }
    }

    // Auto-create debit note
    const dnNo = `DN-${year}-${String(count + 1).padStart(4, '0')}`;
    addDebitNote({
      debitNoteNo: dnNo, userId, type: 'supplier',
      supplierId: selectedPurchase?.supplierId, supplierName: selectedPurchase?.supplierName,
      invoiceNo: selectedPurchase?.purchaseNo, date: returnDate,
      reason: 'Short Supply' as any, description: reason,
      amount: subtotal, gstRate: items[0]?.gstRate || 0,
      cgst: items.reduce((s, i) => s + i.cgst, 0),
      sgst: items.reduce((s, i) => s + i.sgst, 0),
      igst: items.reduce((s, i) => s + i.igst, 0),
      netAmount: total, notes, status: 'Pending', createdAt: new Date().toISOString(),
    });

    toast.success('Purchase Return & Debit Note created!');
    setShowForm(false); loadReturns();
  };

  const filtered = returns.filter(r =>
    r.returnNo.toLowerCase().includes(search.toLowerCase()) ||
    r.supplierName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground">↩️ Purchase Returns</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToExcel({ data: filtered.map(r => ({ 'Return No': r.returnNo, Date: r.returnDate, Supplier: r.supplierName, Reason: r.reason, Subtotal: r.subtotal, Tax: r.taxTotal, Total: r.total })), fileName: 'Purchase_Returns', sheetName: 'Purchase Returns' })}>
            <Download className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button onClick={() => { setShowForm(true); setSelectedPurchaseId(''); setItems([]); setNotes(''); setReason('Defective Goods'); setRestockItems(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Return
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-foreground">{returns.length}</div><div className="text-xs text-muted-foreground">Total Returns</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-primary">₹{returns.reduce((s, r) => s + r.total, 0).toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Value</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-accent-foreground">{returns.filter(r => r.debitNoteId).length}</div><div className="text-xs text-muted-foreground">With Debit Notes</div></CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search returns..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Return No</TableHead><TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead><TableHead>Reason</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No returns found</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">{r.returnNo}</TableCell>
                  <TableCell className="text-muted-foreground">{r.returnDate}</TableCell>
                  <TableCell className="text-foreground">{r.supplierName}</TableCell>
                  <TableCell><Badge variant="secondary">{r.reason}</Badge></TableCell>
                  <TableCell className="text-right font-medium text-foreground">₹{r.total.toLocaleString()}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => setViewReturn(r)}><Eye className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View */}
      <Dialog open={!!viewReturn} onOpenChange={() => setViewReturn(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Return: {viewReturn?.returnNo}</DialogTitle></DialogHeader>
          {viewReturn && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Supplier:</span> <strong className="text-foreground">{viewReturn.supplierName}</strong></div>
                <div><span className="text-muted-foreground">Reason:</span> <Badge variant="secondary">{viewReturn.reason}</Badge></div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {viewReturn.items.map((item, i) => {
                    const looseQtyDisplay = item.selectedUnit === 'carton' && item.piecesPerCarton && item.piecesPerCarton > 1
                      ? ` (${item.quantity * item.piecesPerCarton} Pcs)`
                      : '';
                    return (
                      <TableRow key={i}>
                        <TableCell className="text-foreground">{item.productName}</TableCell>
                        <TableCell className="text-muted-foreground">{item.quantity} {item.unit}{looseQtyDisplay}</TableCell>
                        <TableCell className="text-right text-muted-foreground">₹{item.rate}</TableCell>
                        <TableCell className="text-right text-foreground">₹{item.totalAmount.toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="text-right text-lg font-bold text-foreground">Total: ₹{viewReturn.total.toLocaleString()}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Purchase Return</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><Label>Date</Label><Input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} /></div>
              <div>
                <Label>Purchase</Label>
                <Select value={selectedPurchaseId} onValueChange={onSelectPurchase}>
                  <SelectTrigger><SelectValue placeholder="Select purchase" /></SelectTrigger>
                  <SelectContent>{purchases.map(p => <SelectItem key={p.id} value={p.id}>{p.purchaseNo} - {p.supplierName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Defective Goods">Defective Goods</SelectItem>
                    <SelectItem value="Wrong Item">Wrong Item</SelectItem>
                    <SelectItem value="Excess Quantity">Excess Quantity</SelectItem>
                    <SelectItem value="Quality Issue">Quality Issue</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedPurchase && (
              <div className="p-3 bg-muted rounded-md text-sm">
                <strong className="text-foreground">{selectedPurchase.supplierName}</strong> | Purchase Total: ₹{selectedPurchase.grandTotal.toLocaleString()}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch checked={restockItems} onCheckedChange={setRestockItems} />
              <Label>Deduct items from inventory</Label>
            </div>

            {items.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Return Items (adjust qty)</Label>
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4 text-sm text-foreground">{item.productName}</div>
                    <div className="col-span-2"><Input type="number" value={item.quantity} min={0} onChange={e => updateItemQty(idx, +e.target.value)} className="text-xs" /></div>
                    <div className="col-span-2 text-xs text-muted-foreground">@ ₹{item.rate}</div>
                    <div className="col-span-3 text-right text-sm font-medium text-foreground">₹{item.totalAmount.toLocaleString()}</div>
                    <div className="col-span-1"><Button variant="ghost" size="sm" onClick={() => removeItem(idx)} disabled={items.length <= 1}><Trash2 className="h-3 w-3 text-destructive" /></Button></div>
                  </div>
                ))}
                <div className="text-right space-y-1 text-sm border-t border-border pt-2">
                  <div className="text-muted-foreground">Subtotal: ₹{subtotal.toLocaleString()}</div>
                  <div className="text-muted-foreground">Tax: ₹{taxTotal.toLocaleString()}</div>
                  <div className="text-lg font-bold text-foreground">Total: ₹{total.toLocaleString()}</div>
                </div>
              </div>
            )}

            <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={saveReturn}><RotateCcw className="h-4 w-4 mr-1" />Save Return</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

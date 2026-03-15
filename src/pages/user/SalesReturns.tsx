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

interface SalesReturn {
  id: string;
  returnNo: string;
  returnDate: string;
  invoiceId: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  reason: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  creditNoteId: string | null;
  restockItems: boolean;
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

export default function SalesReturnsPage() {
  const { session, invoices, customers, products, addCreditNote, updateProduct } = useApp();
  const userId = session.userId;
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewReturn, setViewReturn] = useState<SalesReturn | null>(null);
  const [search, setSearch] = useState('');

  // Form
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [reason, setReason] = useState('Goods Returned');
  const [restockItems, setRestockItems] = useState(true);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ReturnItem[]>([]);

  useEffect(() => { loadReturns(); }, [userId]);

  const loadReturns = async () => {
    setLoading(true);
    // sales_returns table
    const { data: rows } = await (supabase as any).from('sales_returns').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (!rows) { setLoading(false); setReturns([]); return; }
    const { data: itemRows } = await (supabase as any).from('sales_return_items').select('*').eq('user_id', userId);
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
      invoiceId: r.original_invoice_id || '', invoiceNo: r.original_invoice_id || '',
      customerId: r.party_id || '', customerName: r.party_name || '',
      reason: r.reason || '', subtotal: r.subtotal || 0, taxTotal: r.tax_total || 0,
      total: r.total || 0, creditNoteId: r.credit_note_id, restockItems: r.restock || false,
      notes: r.notes || '', items: itemMap[r.id] || [],
    })));
    setLoading(false);
  };

  const selectedInvoice = invoices.find(i => i.id === selectedInvoiceId);

  const onSelectInvoice = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = invoices.find(i => i.id === invId);
    if (inv) {
      setItems(inv.items.map(it => {
        const prod = products.find(p => p.id === it.productId);
        const selectedUnit = it.selectedUnit || 'loose';
        const piecesPerCarton = it.piecesPerCarton || prod?.piecesPerCarton || 1;
        const cartonUnitName = it.cartonUnitName || prod?.cartonUnitName || 'Carton';
        // Use the same unit from the original invoice
        const displayUnit = selectedUnit === 'carton' ? cartonUnitName : it.unit;
        return {
          productId: it.productId, productName: it.productName, hsnCode: it.hsn,
          quantity: it.qty, unit: displayUnit, rate: it.sellingPrice, gstRate: it.gstRate,
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
      if (selectedInvoice?.isInterState) { item.igst = item.taxableAmount * item.gstRate / 100; item.cgst = 0; item.sgst = 0; }
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
    if (!selectedInvoiceId) { toast.error('Select an invoice'); return; }
    if (items.length === 0) { toast.error('No items'); return; }

    const year = new Date().getFullYear();
    const count = returns.filter(r => r.returnNo?.startsWith(`SR-${year}`)).length;
    const returnNo = `SR-${year}-${String(count + 1).padStart(4, '0')}`;

    // Check if sales_returns table exists by trying insert
    const { data, error } = await (supabase as any).from('sales_returns').insert({
      return_no: returnNo, user_id: userId, return_date: returnDate,
      original_invoice_id: selectedInvoiceId,
      party_id: selectedInvoice?.customerId || null, party_name: selectedInvoice?.customerName || '',
      reason, subtotal, tax_total: taxTotal, total, restock: restockItems, notes,
    }).select().single();

    if (error) { toast.error('Save failed: ' + error.message); return; }

    await (supabase as any).from('sales_return_items').insert(items.map(i => ({
      return_id: data.id, user_id: userId, product_id: i.productId || null,
      product_name: i.productName, hsn_code: i.hsnCode, quantity: i.quantity,
      unit: i.unit, rate: i.rate, gst_rate: i.gstRate, taxable_amount: i.taxableAmount,
      cgst_amount: i.cgst, sgst_amount: i.sgst, igst_amount: i.igst, total_amount: i.totalAmount,
    })));

    // Restock if needed (convert carton qty to loose units)
    if (restockItems) {
      for (const item of items) {
        if (item.productId) {
          const prod = products.find(p => p.id === item.productId);
          if (prod) {
            const looseQty = item.selectedUnit === 'carton' && item.piecesPerCarton
              ? item.quantity * item.piecesPerCarton
              : item.quantity;
            const newStock = prod.stock + looseQty;
            await (supabase as any).from('products').update({ current_stock: newStock }).eq('id', item.productId);
            updateProduct(item.productId, { stock: newStock });
          }
        }
      }
    }

    // Auto-create credit note
    const cnNo = `CN-${year}-${String(count + 1).padStart(4, '0')}`;
    addCreditNote({
      creditNoteNo: cnNo, userId, invoiceId: selectedInvoiceId,
      invoiceNo: selectedInvoice?.invoiceNo || '', customerId: selectedInvoice?.customerId || '',
      customerName: selectedInvoice?.customerName || '', date: returnDate,
      reason: reason as any,
      items: items.map(i => ({
        productId: i.productId, productName: i.productName, hsn: i.hsnCode,
        qty: i.quantity, unit: i.unit, mrp: i.rate, sellingPrice: i.rate,
        discount: 0, taxableAmount: i.taxableAmount, gstRate: i.gstRate,
        cgst: i.cgst, sgst: i.sgst, igst: i.igst, total: i.totalAmount,
      })),
      subtotal, totalCgst: items.reduce((s, i) => s + i.cgst, 0),
      totalSgst: items.reduce((s, i) => s + i.sgst, 0),
      totalIgst: items.reduce((s, i) => s + i.igst, 0),
      netAmount: total, goodsReturned: restockItems, notes,
      status: 'Pending', createdAt: new Date().toISOString(),
    });

    toast.success('Sales Return & Credit Note created!');
    setShowForm(false); loadReturns();
  };

  const filtered = returns.filter(r =>
    r.returnNo.toLowerCase().includes(search.toLowerCase()) ||
    r.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground">↩️ Sales Returns</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToExcel({ data: filtered.map(r => ({ 'Return No': r.returnNo, Date: r.returnDate, Customer: r.customerName, Reason: r.reason, Subtotal: r.subtotal, Tax: r.taxTotal, Total: r.total, Restocked: r.restockItems ? 'Yes' : 'No' })), fileName: 'Sales_Returns', sheetName: 'Sales Returns' })}>
            <Download className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button onClick={() => { setShowForm(true); setSelectedInvoiceId(''); setItems([]); setNotes(''); setReason('Goods Returned'); setRestockItems(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Return
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-foreground">{returns.length}</div><div className="text-xs text-muted-foreground">Total Returns</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-primary">₹{returns.reduce((s, r) => s + r.total, 0).toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Value</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-accent-foreground">{returns.filter(r => r.restockItems).length}</div><div className="text-xs text-muted-foreground">Restocked</div></CardContent></Card>
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
              <TableHead>Customer</TableHead><TableHead>Invoice</TableHead>
              <TableHead className="text-right">Amount</TableHead><TableHead>Reason</TableHead>
              <TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No returns found</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">{r.returnNo}</TableCell>
                  <TableCell className="text-muted-foreground">{r.returnDate}</TableCell>
                  <TableCell className="text-foreground">{r.customerName}</TableCell>
                  <TableCell className="text-muted-foreground">{r.invoiceNo}</TableCell>
                  <TableCell className="text-right font-medium text-foreground">₹{r.total.toLocaleString()}</TableCell>
                  <TableCell><Badge variant="secondary">{r.reason}</Badge></TableCell>
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
                <div><span className="text-muted-foreground">Customer:</span> <strong className="text-foreground">{viewReturn.customerName}</strong></div>
                <div><span className="text-muted-foreground">Invoice:</span> <strong className="text-foreground">{viewReturn.invoiceNo}</strong></div>
                <div><span className="text-muted-foreground">Reason:</span> <Badge variant="secondary">{viewReturn.reason}</Badge></div>
                <div><span className="text-muted-foreground">Restocked:</span> <strong className="text-foreground">{viewReturn.restockItems ? 'Yes' : 'No'}</strong></div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                   {viewReturn.items.map((item, i) => {
                     const looseQtyDisplay = item.selectedUnit === 'carton' && item.piecesPerCarton && item.piecesPerCarton > 1
                       ? ` (${item.quantity * item.piecesPerCarton} ${item.unit === item.cartonUnitName ? 'Pcs' : 'Pcs'})`
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
          <DialogHeader><DialogTitle>New Sales Return</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><Label>Date</Label><Input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} /></div>
              <div>
                <Label>Invoice</Label>
                <Select value={selectedInvoiceId} onValueChange={onSelectInvoice}>
                  <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                  <SelectContent>{invoices.map(i => <SelectItem key={i.id} value={i.id}>{i.invoiceNo} - {i.customerName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Goods Returned">Goods Returned</SelectItem>
                    <SelectItem value="Defective">Defective</SelectItem>
                    <SelectItem value="Wrong Item">Wrong Item</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedInvoice && (
              <div className="p-3 bg-muted rounded-md text-sm">
                <strong className="text-foreground">{selectedInvoice.customerName}</strong> | Invoice Total: ₹{selectedInvoice.grandTotal.toLocaleString()}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch checked={restockItems} onCheckedChange={setRestockItems} />
              <Label>Restock returned items to inventory</Label>
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

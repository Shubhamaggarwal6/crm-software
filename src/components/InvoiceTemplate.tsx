import { useIsMobile } from '@/hooks/use-mobile';
import { useApp } from '@/context/AppContext';
import { Invoice, numberToWords } from '@/types';
import { X, Printer, Download, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import ShareButton from '@/components/ShareButton';
import { cn } from '@/lib/utils';
import { downloadInvoicePDF } from '@/services/invoicePdfGenerator';

interface Props {
  invoice: Invoice;
  onClose: () => void;
  viewOnly?: boolean;
}

export default function InvoiceTemplate({ invoice, onClose, viewOnly = false }: Props) {
  const { getCurrentUser, updateInvoiceStatus, deleteInvoice, payments, bankAccounts } = useApp();
  const isMobile = useIsMobile();
  const user = getCurrentUser();
  const inv = invoice;

  // Compute payment status from actual payments
  const invPayments = payments.filter(p => p.invoiceId === inv.id);
  const totalReceived = invPayments.reduce((s, p) => s + p.amount, 0);
  const balanceDue = Math.max(0, inv.grandTotal - totalReceived);
  const computedStatus = balanceDue <= 0 ? 'Paid' : totalReceived > 0 ? 'Partial' : 'Pending';
  const paidPercent = inv.grandTotal > 0 ? Math.min(100, Math.round((totalReceived / inv.grandTotal) * 100)) : 0;

  const handlePrint = () => { window.print(); };

  const handleDownloadPDF = () => {
    if (!user) return;
    downloadInvoicePDF({ invoice: inv, user, payments, bankAccounts });
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/50 flex items-start justify-center overflow-y-auto p-2 md:p-6">
      <div className="bg-card rounded-md border shadow-xl w-full max-w-3xl my-2 md:my-8 animate-fade-in">
        <div className="flex items-center justify-between p-3 md:p-4 border-b no-print">
          <h2 className="font-display font-bold text-sm md:text-base">Invoice Details</h2>
          <div className="flex items-center gap-2">
            <ShareButton
              documentType="invoice"
              documentId={inv.id}
              documentNo={inv.invoiceNo}
              firmName={user?.firmName || ''}
              amount={inv.grandTotal}
              userId={inv.userId}
              onDownloadPdf={handleDownloadPDF}
            />
            <button onClick={handlePrint} className="btn-print text-xs"><Printer className="h-3.5 w-3.5" /> Print</button>
            <button onClick={handleDownloadPDF} className="btn-pdf text-xs"><Download className="h-3.5 w-3.5" /> PDF</button>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="p-4 md:p-8 space-y-4 text-sm" id="invoice-print-area">
          <div className="text-center border-b pb-3"><h1 className="text-lg font-display font-bold">TAX INVOICE</h1><p className="text-xs text-muted-foreground">(Original for Recipient)</p></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded bg-muted/30">
              <div className="text-xs font-medium text-muted-foreground mb-1">SELLER:</div>
              <div className="font-bold">{user?.firmName}</div>
              <div className="text-xs">GSTIN: {user?.gstNumber}</div>
              <div className="text-xs">{user?.address}, {user?.city}</div>
              <div className="text-xs">State: {user?.state} ({user?.stateCode})</div>
            </div>
            <div className="p-3 rounded bg-muted/30">
              <div className="text-xs font-medium text-muted-foreground mb-1">BUYER:</div>
              <div className="font-bold">{inv.customerName}</div>
              {inv.customerGst && <div className="text-xs">GSTIN: {inv.customerGst}</div>}
              <div className="text-xs">{inv.customerAddress}</div>
              <div className="text-xs">State: {inv.customerState} ({inv.customerStateCode})</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs p-3 border rounded">
            <div><span className="text-muted-foreground">Invoice No:</span> <b>{inv.invoiceNo}</b></div>
            <div><span className="text-muted-foreground">Date:</span> {inv.date}</div>
            {inv.vehicleNo && <div><span className="text-muted-foreground">Vehicle:</span> {inv.vehicleNo}</div>}
            <div><span className="text-muted-foreground">Supply:</span> {inv.isInterState ? 'Inter-State' : 'Intra-State'}</div>
          </div>

          {/* Items Table */}
          {isMobile ? (
            <div className="space-y-2">
              {inv.items.map((item, i) => (
                <div key={i} className="p-3 border rounded text-xs">
                  <div className="font-medium">{i + 1}. {item.productName} <span className="text-muted-foreground">(HSN: {item.hsn})</span></div>
                  <div className="flex justify-between mt-1"><span>{item.qty} {item.unit} × ₹{item.sellingPrice}</span><span className="font-bold">₹{item.total.toFixed(0)}</span></div>
                  <div className="text-muted-foreground">GST: {item.gstRate}% | Tax: ₹{(item.cgst + item.sgst + item.igst).toFixed(0)}</div>
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full text-xs border">
              <thead><tr className="bg-primary text-primary-foreground">
                <th className="py-2 px-2 text-left">#</th><th className="py-2 px-2 text-left">Product</th><th className="py-2 px-2">HSN</th>
                <th className="py-2 px-2">Qty</th><th className="py-2 px-2">Unit</th><th className="py-2 px-2">Rate</th>
                <th className="py-2 px-2">Disc</th><th className="py-2 px-2">Taxable</th><th className="py-2 px-2">GST</th><th className="py-2 px-2 text-right">Total</th>
              </tr></thead>
              <tbody>{inv.items.map((item, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1.5 px-2">{i + 1}</td><td className="py-1.5 px-2">{item.productName}</td>
                  <td className="py-1.5 px-2 text-center font-mono">{item.hsn}</td><td className="py-1.5 px-2 text-center">{item.qty}</td>
                  <td className="py-1.5 px-2 text-center">{item.unit}</td><td className="py-1.5 px-2 text-center">₹{item.sellingPrice}</td>
                  <td className="py-1.5 px-2 text-center">{item.discount > 0 ? `₹${item.discount}` : '—'}</td>
                  <td className="py-1.5 px-2 text-center">₹{item.taxableAmount}</td><td className="py-1.5 px-2 text-center">{item.gstRate}%</td>
                  <td className="py-1.5 px-2 text-right font-medium">₹{item.total.toFixed(0)}</td>
                </tr>
              ))}</tbody>
            </table>
          )}

          {/* Totals */}
          <div className="max-w-xs ml-auto space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{inv.subtotal.toLocaleString('en-IN')}</span></div>
            {inv.totalCgst > 0 && <div className="flex justify-between"><span>CGST</span><span>₹{inv.totalCgst.toFixed(2)}</span></div>}
            {inv.totalSgst > 0 && <div className="flex justify-between"><span>SGST</span><span>₹{inv.totalSgst.toFixed(2)}</span></div>}
            {inv.totalIgst > 0 && <div className="flex justify-between"><span>IGST</span><span>₹{inv.totalIgst.toFixed(2)}</span></div>}
            {inv.roundOff !== 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>Round Off</span><span>₹{inv.roundOff.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Grand Total</span><span>₹{inv.grandTotal.toLocaleString('en-IN')}</span></div>
          </div>

          <div className="text-xs italic text-muted-foreground border-t pt-2">{numberToWords(inv.grandTotal)}</div>

          {/* Payment Status Section */}
          <div className={cn("rounded-md p-4 border", computedStatus === 'Paid' ? 'bg-green-50 border-green-200' : computedStatus === 'Partial' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200')}>
            <div className="flex items-center gap-2 mb-2">
              {computedStatus === 'Paid' && <><CheckCircle className="h-5 w-5 text-green-600" /><span className="font-display font-bold text-green-700">PAID</span></>}
              {computedStatus === 'Partial' && <><AlertTriangle className="h-5 w-5 text-amber-600" /><span className="font-display font-bold text-amber-700">PARTIAL PAYMENT</span></>}
              {computedStatus === 'Pending' && <><Clock className="h-5 w-5 text-red-600" /><span className="font-display font-bold text-red-700">PAYMENT PENDING</span></>}
            </div>
            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-2.5 mb-2">
              <div className="bg-green-500 h-2.5 rounded-full transition-all" style={{ width: `${paidPercent}%` }} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-green-700">Received: ₹{totalReceived.toLocaleString('en-IN')}</span>
              {balanceDue > 0 && <span className="text-red-700">Remaining: ₹{balanceDue.toLocaleString('en-IN')}</span>}
            </div>
            {/* Payment history */}
            {invPayments.length > 0 && (
              <div className="mt-3 border-t pt-2">
                <div className="text-xs font-medium text-muted-foreground mb-1">Payment History</div>
                <div className="space-y-1">
                  {invPayments.map(p => (
                    <div key={p.id} className="flex justify-between text-xs">
                      <span>{p.date} · {p.mode}{p.bankName ? ` · ${p.bankName}` : ''}</span>
                      <span className="font-mono text-green-700">₹{p.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {user?.bankName && (
            <div className="text-xs p-3 border rounded">
              <div className="font-medium mb-1">Bank Details:</div>
              <div>Bank: {user.bankName} | A/C: {user.accountNumber} | IFSC: {user.ifsc} | Branch: {user.branch}</div>
            </div>
          )}

          {user?.termsAndConditions && (
            <div className="text-xs text-muted-foreground whitespace-pre-wrap">
              <div className="font-medium text-foreground mb-1">Terms & Conditions:</div>
              {user.termsAndConditions}
            </div>
          )}

          <div className="text-xs text-muted-foreground border-t pt-2 flex justify-between">
            <span>{inv.createdBy.role === 'user' ? '👑' : '👷'} {inv.createdBy.name} · {new Date(inv.createdBy.timestamp).toLocaleString()}</span>
            <span className="font-medium">Authorised Signatory</span>
          </div>
        </div>

        {!viewOnly && (
          <div className="border-t p-3 md:p-4 flex flex-wrap gap-2 no-print">
            <button onClick={() => { deleteInvoice(inv.id); onClose(); }} className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive hover:bg-destructive/10">🗑️ Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Receipt, Search, Printer, Download } from 'lucide-react';
import ShareButton from '@/components/ShareButton';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

export default function PaymentReceiptPage() {
  const { session, payments, customers, invoices, getCurrentUser, bankAccounts } = useApp();
  const userId = session.userId;
  const user = getCurrentUser();
  const [search, setSearch] = useState('');

  const userPayments = payments
    .filter(p => p.userId === userId && p.invoiceId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const filtered = userPayments.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    const custName = getCustomerName(p);
    return p.receiptNo.toLowerCase().includes(q) ||
      custName.toLowerCase().includes(q) ||
      (p.invoiceId || '').toLowerCase().includes(q);
  });

  function getCustomerName(payment: any) {
    if (payment.customerId) {
      const c = customers.find(c => c.id === payment.customerId);
      if (c) return c.name;
    }
    const inv = invoices.find(i => i.id === payment.invoiceId);
    return inv?.customerName || 'Unknown';
  }

  function generateReceipt(payment: any) {
    if (!user) return;
    const customerName = getCustomerName(payment);
    const doc = new jsPDF('p', 'mm', 'a4');
    const W = doc.internal.pageSize.getWidth();
    const M = 14;

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, W, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT RECEIPT', M, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(user.firmName, M, 28);
    if (user.gstNumber) doc.text(`GSTIN: ${user.gstNumber}`, M, 34);
    doc.text(`Receipt #${payment.receiptNo}`, W - M, 18, { align: 'right' });
    doc.text(`Date: ${formatDate(payment.date)}`, W - M, 28, { align: 'right' });

    let y = 50;

    // Received From
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text('RECEIVED FROM', M, y);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(customerName, M, y + 7);

    // Amount box
    doc.setFillColor(237, 247, 237);
    doc.roundedRect(W / 2, y - 5, W / 2 - M, 25, 3, 3, 'F');
    doc.setTextColor(22, 163, 74);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('AMOUNT RECEIVED', W / 2 + 8, y + 2);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`₹${payment.amount.toLocaleString('en-IN')}`, W / 2 + 8, y + 14);

    y += 35;

    // Details
    doc.setDrawColor(226, 232, 240);
    doc.line(M, y, W - M, y);
    y += 8;

    const details: [string, string][] = [
      ['Invoice', payment.invoiceId || '-'],
      ['Payment Mode', payment.mode],
      ['Reference', payment.reference || payment.utrNumber || payment.chequeNo || '-'],
    ];

    if (payment.bankName) details.push(['Bank', payment.bankName]);
    if (payment.note) details.push(['Notes', payment.note]);

    doc.setFontSize(10);
    details.forEach(([label, value]) => {
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(label, M, y);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(String(value), M + 45, y);
      y += 8;
    });

    y += 15;
    doc.setDrawColor(226, 232, 240);
    doc.line(M, y, W - M, y);
    y += 20;

    // Signature
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Authorized Signatory', W - M - 50, y);
    doc.line(W - M - 60, y - 3, W - M, y - 3);

    // Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text('This is a computer-generated receipt.', W / 2, 280, { align: 'center' });

    doc.save(`Receipt_${payment.receiptNo}.pdf`);
    toast.success('Receipt downloaded');
  }

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" /> Payment Receipts
        </h1>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <input
          placeholder="Search by receipt #, customer, invoice..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-2 border rounded-md text-sm bg-background"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="hero-card text-center text-muted-foreground py-8">
          No payments found. Record payments against invoices to generate receipts.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const custName = getCustomerName(p);
            return (
              <div key={p.id} className="hero-card flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {p.receiptNo}
                    <span className="text-xs text-muted-foreground">— {custName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{formatDate(p.date)}</span>
                    <span>•</span>
                    <span>{p.mode}</span>
                    {p.invoiceId && <span className="font-mono">Inv: {p.invoiceId}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-display font-bold text-primary">₹{p.amount.toLocaleString('en-IN')}</span>
                  <ShareButton
                    documentType="payment"
                    documentId={p.id}
                    documentNo={p.receiptNo}
                    firmName=""
                    amount={p.amount}
                    userId={userId}
                    onDownloadPdf={() => generateReceipt(p)}
                    iconOnly
                  />
                  <Button size="sm" variant="outline" onClick={() => generateReceipt(p)}>
                    <Download className="h-3.5 w-3.5 mr-1" /> PDF
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

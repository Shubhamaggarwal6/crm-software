/**
 * Professional GST Tax Invoice PDF Generator
 * Generates a clean, CA-ready invoice document.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, User, Payment, numberToWords, BankAccount } from '@/types';

interface InvoicePdfOptions {
  invoice: Invoice;
  user: User;
  payments?: Payment[];
  bankAccounts?: BankAccount[];
  copyLabel?: string; // "Original for Recipient", "Duplicate for Supplier", etc.
}

// Colors
const BRAND: [number, number, number] = [15, 23, 42];
const ACCENT: [number, number, number] = [37, 99, 235];
const LIGHT_BG: [number, number, number] = [248, 250, 252];
const BORDER: [number, number, number] = [226, 232, 240];
const GREEN: [number, number, number] = [22, 163, 74];
const AMBER: [number, number, number] = [217, 119, 6];
const RED: [number, number, number] = [220, 38, 38];
const MUTED: [number, number, number] = [100, 116, 139];

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtRound(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

export function generateInvoicePDF(options: InvoicePdfOptions) {
  const { invoice: inv, user, payments = [], bankAccounts = [], copyLabel = 'Original for Recipient' } = options;
  const doc = new jsPDF('p', 'mm', 'a4');
  const W = doc.internal.pageSize.getWidth();  // 210
  const H = doc.internal.pageSize.getHeight(); // 297
  const M = 14; // margin
  const CW = W - 2 * M; // content width

  // ─── HEADER BAND ───
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 38, 'F');

  // Firm name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(user.firmName || 'Business Name', M, 16);

  // Firm details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const firmLines: string[] = [];
  if (user.gstNumber) firmLines.push(`GSTIN: ${user.gstNumber}`);
  const addrParts = [user.address, user.city, user.state].filter(Boolean).join(', ');
  if (addrParts) firmLines.push(addrParts);
  if (user.stateCode) firmLines[firmLines.length - 1] += ` (${user.stateCode})`;
  if (user.phone) firmLines.push(`Ph: ${user.phone}`);
  if (user.email) firmLines.push(user.email);
  firmLines.forEach((line, i) => doc.text(line, M, 22 + i * 3.5));

  // Invoice title on right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('TAX INVOICE', W - M, 16, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(copyLabel, W - M, 22, { align: 'right' });

  let Y = 44;

  // ─── INVOICE META BAR ───
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(M, Y, CW, 14, 1.5, 1.5, 'FD');
  doc.setTextColor(...MUTED);
  doc.setFontSize(7);
  doc.text('INVOICE NO.', M + 4, Y + 4);
  doc.text('DATE', M + 55, Y + 4);
  doc.text('SUPPLY TYPE', M + 100, Y + 4);
  if (inv.vehicleNo) doc.text('VEHICLE NO.', M + 145, Y + 4);

  doc.setTextColor(...BRAND);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(inv.invoiceNo, M + 4, Y + 10.5);
  doc.setFontSize(9);
  doc.text(formatDate(inv.date), M + 55, Y + 10.5);
  doc.text(inv.isInterState ? 'Inter-State' : 'Intra-State', M + 100, Y + 10.5);
  if (inv.vehicleNo) doc.text(inv.vehicleNo, M + 145, Y + 10.5);

  Y += 20;

  // ─── BUYER DETAILS BOX ───
  doc.setDrawColor(...BORDER);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(M, Y, CW, 24, 1.5, 1.5, 'D');

  // Label
  doc.setFillColor(...ACCENT);
  doc.roundedRect(M + 3, Y + 2, 22, 5, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', M + 14, Y + 5.5, { align: 'center' });

  doc.setTextColor(...BRAND);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(inv.customerName, M + 30, Y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  let buyerY = Y + 11;
  if (inv.customerGst) { doc.text(`GSTIN: ${inv.customerGst}`, M + 5, buyerY); buyerY += 3.5; }
  if (inv.customerPhone) { doc.text(`Phone: ${inv.customerPhone}`, M + 5, buyerY); buyerY += 3.5; }
  if (inv.customerAddress) { doc.text(inv.customerAddress, M + 5, buyerY); buyerY += 3.5; }
  if (inv.customerState) doc.text(`State: ${inv.customerState}${inv.customerStateCode ? ` (${inv.customerStateCode})` : ''}`, M + 5, buyerY);

  Y += 30;

  // ─── ITEMS TABLE ───
  const isInter = inv.isInterState;
  const head = isInter
    ? [['#', 'PRODUCT / SERVICE', 'HSN', 'QTY', 'UNIT', 'RATE', 'DISC.', 'TAXABLE', 'IGST', 'TOTAL']]
    : [['#', 'PRODUCT / SERVICE', 'HSN', 'QTY', 'UNIT', 'RATE', 'DISC.', 'TAXABLE', 'CGST', 'SGST', 'TOTAL']];

  const body = inv.items.map((item, i) => {
    // Build product description with carton info
    let productDesc = item.productName;
    const selUnit = (item as any).selectedUnit;
    const ppc = (item as any).piecesPerCarton || 1;
    const cartonName = (item as any).cartonUnitName || 'Carton';
    if (selUnit === 'carton' && ppc > 1) {
      productDesc += `\n${item.qty} ${cartonName}${item.qty > 1 ? 's' : ''} × ${ppc} ${item.unit}/Ctn = ${item.qty * ppc} ${item.unit}`;
    }

    const qtyDisplay = selUnit === 'carton' && ppc > 1 ? `${item.qty}` : item.qty.toString();
    const unitDisplay = selUnit === 'carton' && ppc > 1 ? cartonName : item.unit;

    const base = [
      (i + 1).toString(),
      productDesc,
      item.hsn || '—',
      qtyDisplay,
      unitDisplay,
      fmtRound(item.sellingPrice),
      item.discount > 0 ? fmtRound(item.discount) : '—',
      fmtRound(item.taxableAmount),
    ];
    if (isInter) {
      base.push(`${fmtRound(item.igst)} (${item.gstRate}%)`);
    } else {
      const halfRate = item.gstRate / 2;
      base.push(`${fmtRound(item.cgst)} (${halfRate}%)`);
      base.push(`${fmtRound(item.sgst)} (${halfRate}%)`);
    }
    base.push(fmtRound(item.total));
    return base;
  });

  autoTable(doc, {
    startY: Y,
    head,
    body,
    theme: 'plain',
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      lineColor: [...BORDER] as any,
      lineWidth: 0.2,
      textColor: [...BRAND] as any,
    },
    headStyles: {
      fillColor: [...BRAND] as any,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: isInter ? 42 : 36 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'center', cellWidth: 12 },
      4: { halign: 'center', cellWidth: 12 },
      5: { halign: 'right', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 14 },
      7: { halign: 'right', cellWidth: 18 },
      ...(isInter
        ? { 8: { halign: 'right', cellWidth: 22 }, 9: { halign: 'right', cellWidth: 20, fontStyle: 'bold' as const } }
        : { 8: { halign: 'right', cellWidth: 18 }, 9: { halign: 'right', cellWidth: 18 }, 10: { halign: 'right', cellWidth: 20, fontStyle: 'bold' as const } }
      ),
    },
    alternateRowStyles: { fillColor: [...LIGHT_BG] as any },
    didParseCell: (data: any) => {
      // Make last column bold
      const lastCol = isInter ? 9 : 10;
      if (data.section === 'body' && data.column.index === lastCol) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  Y = (doc as any).lastAutoTable.finalY + 4;

  // ─── TOTALS SECTION ───
  const totalsX = W - M - 76;
  const totalsW = 76;

  // Amount in words on left side
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...MUTED);
  const wordsText = doc.splitTextToSize(`Amount in Words: ${numberToWords(inv.grandTotal)}`, totalsX - M - 5);
  doc.text(wordsText, M, Y + 4);

  // Totals box
  doc.setDrawColor(...BORDER);
  doc.setFillColor(255, 255, 255);

  const totalRows: [string, string, boolean][] = [
    ['Subtotal', fmt(inv.subtotal), false],
  ];
  if (inv.totalDiscount > 0) totalRows.push(['Item Discount', `- ${fmt(inv.totalDiscount)}`, false]);
  // Invoice-level discount
  if (inv.invoiceDiscountType && inv.invoiceDiscountType !== 'none' && (inv.invoiceDiscountAmount || 0) > 0) {
    const discLabel = inv.invoiceDiscountPercent
      ? `Invoice Disc. (${inv.invoiceDiscountPercent}%${inv.invoiceDiscountType === 'before_tax' ? ' Before Tax' : ' After Tax'})`
      : `Invoice Disc. (${inv.invoiceDiscountType === 'before_tax' ? 'Before Tax' : 'After Tax'})`;
    totalRows.push([discLabel, `- ${fmt(inv.invoiceDiscountAmount || 0)}`, false]);
  }
  if (inv.totalCgst > 0) totalRows.push(['CGST', fmt(inv.totalCgst), false]);
  if (inv.totalSgst > 0) totalRows.push(['SGST', fmt(inv.totalSgst), false]);
  if (inv.totalIgst > 0) totalRows.push(['IGST', fmt(inv.totalIgst), false]);
  // Other charges
  if (inv.otherCharges && inv.otherCharges.length > 0) {
    inv.otherCharges.forEach(ch => {
      const chLabel = ch.withGst ? `${ch.chargeName} (+${ch.gstRate}% GST)` : ch.chargeName;
      totalRows.push([chLabel, fmt(ch.totalAmount), false]);
    });
  } else if ((inv.otherChargesTotal || 0) > 0) {
    totalRows.push(['Other Charges', fmt(inv.otherChargesTotal || 0), false]);
  }
  if (inv.roundOff !== 0) totalRows.push(['Round Off', fmt(inv.roundOff), false]);
  totalRows.push(['GRAND TOTAL', fmt(inv.grandTotal), true]);

  totalRows.forEach(([label, value, isBold], idx) => {
    const rowY = Y + idx * 6;
    if (isBold) {
      doc.setFillColor(...BRAND);
      doc.roundedRect(totalsX, rowY - 1, totalsW, 7, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
    } else {
      if (idx % 2 === 0) {
        doc.setFillColor(...LIGHT_BG);
        doc.rect(totalsX, rowY - 1, totalsW, 6, 'F');
      }
      doc.setTextColor(...BRAND);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }
    doc.text(label, totalsX + 3, rowY + 3);
    doc.text(value, totalsX + totalsW - 3, rowY + 3, { align: 'right' });
  });

  Y += totalRows.length * 6 + 6;

  // ─── PAYMENT STATUS ───
  const invPayments = payments.filter(p => p.invoiceId === inv.id);
  const totalReceived = invPayments.reduce((s, p) => s + p.amount, 0);
  const balanceDue = Math.max(0, inv.grandTotal - totalReceived);
  const status = balanceDue <= 0 ? 'Paid' : totalReceived > 0 ? 'Partial' : 'Pending';

  const statusColor = status === 'Paid' ? GREEN : status === 'Partial' ? AMBER : RED;
  const statusText = status === 'Paid' ? 'PAID IN FULL' : status === 'Partial' ? 'PARTIALLY PAID' : 'PAYMENT PENDING';

  doc.setFillColor(...statusColor);
  doc.roundedRect(M, Y, CW, status === 'Partial' ? 14 : 10, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(statusText, W / 2, Y + 6, { align: 'center' });
  if (status === 'Partial') {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Received: ${fmt(totalReceived)}  |  Balance Due: ${fmt(balanceDue)}`, W / 2, Y + 11.5, { align: 'center' });
  }
  if (status === 'Pending' && balanceDue > 0) {
    // Nothing extra needed
  }

  Y += (status === 'Partial' ? 18 : 14);

  // ─── PAYMENT HISTORY ───
  if (invPayments.length > 0) {
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('PAYMENT HISTORY', M, Y + 3);
    Y += 5;
    invPayments.forEach((p, i) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...BRAND);
      doc.text(`${formatDate(p.date)}  •  ${p.mode}${p.bankName ? ' - ' + p.bankName : ''}`, M + 2, Y + 3);
      doc.setTextColor(...GREEN);
      doc.text(fmt(p.amount), W - M, Y + 3, { align: 'right' });
      Y += 4;
    });
    Y += 2;
  }

  // ─── BANK DETAILS ───
  const defaultBank = bankAccounts.find(a => a.isDefault) || bankAccounts[0];
  const hasBank = defaultBank || user.bankName;
  if (hasBank) {
    doc.setDrawColor(...BORDER);
    doc.setFillColor(...LIGHT_BG);
    const bankH = 18;
    doc.roundedRect(M, Y, CW, bankH, 1.5, 1.5, 'FD');

    doc.setFillColor(...ACCENT);
    doc.roundedRect(M + 3, Y + 2, 30, 5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('BANK DETAILS', M + 18, Y + 5.5, { align: 'center' });

    doc.setTextColor(...BRAND);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    const bankName = defaultBank?.bankName || user.bankName || '';
    const acNo = defaultBank?.accountNumber || user.accountNumber || '';
    const ifsc = defaultBank?.ifscCode || user.ifsc || '';
    const branch = defaultBank?.branchName || user.branch || '';
    const holder = defaultBank?.accountHolderName || user.firmName || '';

    const col1X = M + 5;
    const col2X = M + CW / 2;
    doc.text(`Bank: ${bankName}`, col1X, Y + 11);
    doc.text(`A/C No: ${acNo}`, col1X, Y + 15);
    doc.text(`IFSC: ${ifsc}`, col2X, Y + 11);
    doc.text(`Branch: ${branch}`, col2X, Y + 15);

    Y += bankH + 4;
  }

  // ─── TERMS & CONDITIONS ───
  if (user.termsAndConditions) {
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('TERMS & CONDITIONS', M, Y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const termsLines = doc.splitTextToSize(user.termsAndConditions, CW - 10);
    doc.text(termsLines.slice(0, 4), M + 2, Y + 7); // max 4 lines
    Y += 7 + Math.min(termsLines.length, 4) * 3;
  }

  // ─── SIGNATURE AREA ───
  Y = Math.max(Y + 5, H - 32);
  doc.setDrawColor(...BORDER);
  doc.line(M, Y, W - M, Y);

  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('This is a computer-generated invoice.', M, Y + 5);

  // Created by
  if (inv.createdBy?.name) {
    doc.text(`Created by: ${inv.createdBy.name} (${inv.createdBy.role})`, M, Y + 9);
  }

  // Signature block on right
  doc.setTextColor(...BRAND);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`For ${user.firmName || ''}`, W - M, Y + 5, { align: 'right' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorised Signatory', W - M, Y + 18, { align: 'right' });
  // Signature line
  doc.setDrawColor(...BRAND);
  doc.line(W - M - 45, Y + 14, W - M, Y + 14);

  // ─── FOOTER ───
  doc.setFillColor(...BRAND);
  doc.rect(0, H - 6, W, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('Powered by BillSaathi', W / 2, H - 2.5, { align: 'center' });

  return doc;
}

export function downloadInvoicePDF(options: InvoicePdfOptions) {
  const doc = generateInvoicePDF(options);
  doc.save(`Invoice_${options.invoice.invoiceNo}.pdf`);
}

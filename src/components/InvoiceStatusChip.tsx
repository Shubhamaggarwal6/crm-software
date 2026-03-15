import { useApp } from '@/context/AppContext';
import { Invoice } from '@/types';
import { CheckCircle, AlertTriangle, AlertOctagon, Ban } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  invoice: Invoice;
  showDetails?: boolean;
}

export default function InvoiceStatusChip({ invoice, showDetails = true }: Props) {
  const { getInvoiceStatus, payments } = useApp();
  const { status, received, balance } = getInvoiceStatus(invoice.id);
  const paidPercent = invoice.grandTotal > 0 ? Math.min(100, Math.round((received / invoice.grandTotal) * 100)) : 0;
  const invPayments = payments.filter(p => p.invoiceId === invoice.id);
  const lastPayment = invPayments.length > 0 ? invPayments[invPayments.length - 1] : null;

  const chip = (
    <div className="inline-flex flex-col items-end gap-0.5">
      {status === 'Paid' && (
        <>
          <span className="inline-flex items-center gap-1 rounded-full bg-green-600 text-white px-2.5 py-0.5 text-[10px] font-bold">
            <CheckCircle className="h-3 w-3" /> PAID
          </span>
          {showDetails && lastPayment && (
            <span className="text-[9px] text-muted-foreground">Received on {lastPayment.date}</span>
          )}
        </>
      )}
      {status === 'Partial' && (
        <>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-white px-2.5 py-0.5 text-[10px] font-bold">
            <AlertTriangle className="h-3 w-3" /> PARTIAL
          </span>
          {showDetails && (
            <>
              <span className="text-[9px] text-green-600">Received ₹{received.toLocaleString('en-IN')}</span>
              <span className="text-[9px] text-destructive">Balance ₹{balance.toLocaleString('en-IN')}</span>
              <div className="w-20 h-1.5 rounded-full bg-destructive/20 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${paidPercent}%` }} />
              </div>
            </>
          )}
        </>
      )}
      {status === 'Pending' && (
        <>
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive text-white px-2.5 py-0.5 text-[10px] font-bold">
            <AlertOctagon className="h-3 w-3" /> UNPAID
          </span>
          {showDetails && (
            <span className="text-[9px] text-destructive">Due ₹{invoice.grandTotal.toLocaleString('en-IN')}</span>
          )}
        </>
      )}
    </div>
  );

  if (invPayments.length === 0) return chip;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{chip}</TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs p-3">
          <div className="text-xs space-y-1.5">
            <div className="font-bold text-sm mb-1">Payment History</div>
            <table className="w-full text-[11px]">
              <thead><tr className="text-muted-foreground"><th className="text-left pr-2">Date</th><th className="text-right pr-2">Amount</th><th className="text-left pr-2">Mode</th><th className="text-left">Ref</th></tr></thead>
              <tbody>
                {invPayments.map(p => (
                  <tr key={p.id}>
                    <td className="pr-2">{p.date}</td>
                    <td className="text-right pr-2 font-mono text-green-600">₹{p.amount.toLocaleString('en-IN')}</td>
                    <td className="pr-2">{p.mode}</td>
                    <td className="text-muted-foreground">{p.reference || p.utrNumber || p.chequeNo || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t pt-1 flex justify-between font-medium">
              <span>Total: ₹{received.toLocaleString('en-IN')}</span>
              {balance > 0 && <span className="text-destructive">Due: ₹{balance.toLocaleString('en-IN')}</span>}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

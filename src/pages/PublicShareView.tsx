import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getShareTokenData } from '@/services/shareService';
import { Loader2, AlertTriangle, Printer } from 'lucide-react';

export default function PublicShareView({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<Record<string, any> | null>(null);
  const [docType, setDocType] = useState<string>('');
  const [ownerProfile, setOwnerProfile] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    loadDocument();
  }, [token]);

  async function loadDocument() {
    setLoading(true);
    const tokenData = await getShareTokenData(token);

    if (!tokenData) {
      setError('This link is invalid.');
      setLoading(false);
      return;
    }
    if ('expired' in tokenData) {
      setError('This link has expired.');
      setLoading(false);
      return;
    }

    setDocType(tokenData.document_type);

    const tableMap: Record<string, string> = {
      invoice: 'invoices',
      quotation: 'quotations',
      credit_note: 'credit_notes',
      debit_note: 'debit_notes',
      delivery_challan: 'delivery_challans',
      sales_return: 'sales_returns',
      purchase_return: 'purchase_returns',
    };

    const table = tableMap[tokenData.document_type] || 'invoices';

    const { data: doc } = await supabase
      .from(table as any)
      .select('*')
      .eq('id', tokenData.document_id)
      .maybeSingle();

    if (!doc) {
      setError('Document not found.');
      setLoading(false);
      return;
    }

    const docRecord = doc as Record<string, any>;

    // Fetch owner profile
    const { data: owner } = await supabase
      .from('owner_profiles')
      .select('*')
      .eq('id', docRecord.user_id)
      .maybeSingle();

    setOwnerProfile(owner as Record<string, any> | null);
    setDocument(docRecord);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">{error}</h1>
          <p className="text-muted-foreground text-sm">If you believe this is an error, please contact the sender for a new link.</p>
        </div>
      </div>
    );
  }

  if (!document) return null;

  const typeLabels: Record<string, string> = {
    invoice: 'Tax Invoice',
    quotation: 'Quotation',
    credit_note: 'Credit Note',
    debit_note: 'Debit Note',
    delivery_challan: 'Delivery Challan',
    payment: 'Payment Receipt',
    sales_return: 'Sales Return',
    purchase_return: 'Purchase Return',
  };

  const docNo = document.id || document.invoice_no || document.quotation_no || document.credit_note_no || document.debit_note_no || document.challan_no || '';
  const total = document.total || document.grand_total || 0;
  const date = document.invoice_date || document.quotation_date || document.credit_note_date || document.debit_note_date || document.challan_date || '';
  const partyName = document.customer_name || document.party_name || document.supplier_name || '';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary-foreground/20 flex items-center justify-center">
              <span className="font-bold text-sm">B</span>
            </div>
            <span className="font-semibold text-sm">BillSaathi</span>
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded px-3 py-1.5 text-xs transition-colors">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
      </div>

      {/* Document */}
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="bg-card rounded-lg shadow-sm border p-6 md:p-8 print:shadow-none print:border-0">
          <div className="text-center border-b pb-4 mb-6">
            <h1 className="text-lg font-bold text-foreground">{typeLabels[docType] || 'Document'}</h1>
            {ownerProfile && <p className="text-xs text-muted-foreground mt-1">{ownerProfile.firm_name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs text-muted-foreground">Document No</p>
              <p className="font-semibold text-sm">{docNo}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-semibold text-sm">{date}</p>
            </div>
          </div>

          {partyName && (
            <div className="bg-muted/30 rounded p-3 mb-6">
              <p className="text-xs text-muted-foreground">Bill To</p>
              <p className="font-semibold text-sm">{partyName}</p>
              {document.customer_gst && <p className="text-xs text-muted-foreground">GSTIN: {document.customer_gst}</p>}
              {document.customer_address && <p className="text-xs text-muted-foreground">{document.customer_address}</p>}
            </div>
          )}

          <div className="border-t pt-4 mt-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-sm">₹{(document.subtotal || 0).toLocaleString('en-IN')}</span>
            </div>
            {(document.cgst_total || 0) > 0 && (
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-muted-foreground">CGST</span>
                <span className="text-sm">₹{document.cgst_total.toLocaleString('en-IN')}</span>
              </div>
            )}
            {(document.sgst_total || 0) > 0 && (
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-muted-foreground">SGST</span>
                <span className="text-sm">₹{document.sgst_total.toLocaleString('en-IN')}</span>
              </div>
            )}
            {(document.igst_total || 0) > 0 && (
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-muted-foreground">IGST</span>
                <span className="text-sm">₹{document.igst_total.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between items-center mt-3 pt-3 border-t">
              <span className="font-bold text-sm">Grand Total</span>
              <span className="font-bold text-lg">₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {ownerProfile && (
            <div className="mt-8 pt-4 border-t text-center">
              <p className="text-xs text-muted-foreground">
                {ownerProfile.firm_name}
                {ownerProfile.address ? ` • ${ownerProfile.address}` : ''}
                {ownerProfile.gst_number ? ` • GSTIN: ${ownerProfile.gst_number}` : ''}
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Powered by BillSaathi • This is a shared document view
        </p>
      </div>
    </div>
  );
}

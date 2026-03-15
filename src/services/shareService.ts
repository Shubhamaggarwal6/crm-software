import { supabase } from '@/integrations/supabase/client';

export type ShareDocumentType = 'invoice' | 'payment' | 'delivery_challan' | 'sales_return' | 'purchase_return' | 'credit_note' | 'debit_note' | 'quotation';

export async function createShareToken(documentType: ShareDocumentType, documentId: string, userId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('share_tokens')
    .select('token')
    .eq('document_type', documentType)
    .eq('document_id', documentId)
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (existing?.token) return existing.token;

  const { data, error } = await supabase
    .from('share_tokens')
    .insert({
      user_id: userId,
      document_type: documentType,
      document_id: documentId,
    })
    .select('token')
    .single();

  if (error) {
    console.error('Error creating share token:', error);
    return null;
  }
  return data?.token || null;
}

interface ShareTokenRecord {
  id: string;
  user_id: string;
  document_type: string;
  document_id: string;
  token: string;
  expires_at: string;
  view_count: number;
  created_at: string;
}

export async function getShareTokenData(token: string): Promise<ShareTokenRecord | { expired: true } | null> {
  const { data, error } = await supabase
    .from('share_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) return null;

  if (new Date(data.expires_at) < new Date()) return { expired: true };

  // Increment view count - fire and forget
  supabase
    .from('share_tokens')
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq('id', data.id)
    .then(() => {});

  return data as ShareTokenRecord;
}

export function getShareUrl(token: string): string {
  return `${window.location.origin}/share/${token}`;
}

export function generateWhatsAppMessage(docType: string, docNo: string, firmName: string, amount: number, shareUrl: string): string {
  const formattedAmount = `₹${amount.toLocaleString('en-IN')}`;
  const typeLabel = docType === 'invoice' ? 'Invoice' : docType === 'quotation' ? 'Quotation' : docType === 'payment' ? 'Payment Receipt' : docType === 'credit_note' ? 'Credit Note' : docType === 'debit_note' ? 'Debit Note' : 'Document';
  return `${typeLabel} *${docNo}* from *${firmName}*\nAmount: *${formattedAmount}*\n\nView here: ${shareUrl}`;
}

export function generateEmailSubject(docType: string, docNo: string, firmName: string): string {
  const typeLabel = docType === 'invoice' ? 'Invoice' : docType === 'quotation' ? 'Quotation' : 'Document';
  return `${typeLabel} ${docNo} from ${firmName}`;
}

export function generateEmailBody(docType: string, docNo: string, firmName: string, amount: number, shareUrl: string): string {
  const formattedAmount = `₹${amount.toLocaleString('en-IN')}`;
  const typeLabel = docType === 'invoice' ? 'Invoice' : docType === 'quotation' ? 'Quotation' : 'Document';
  return `Dear Customer,\n\nPlease find your ${typeLabel} ${docNo} from ${firmName}.\n\nAmount: ${formattedAmount}\n\nView document: ${shareUrl}\n\nThank you for your business!\n\nRegards,\n${firmName}`;
}

export function generateSmsMessage(docType: string, docNo: string, firmName: string, amount: number, shareUrl: string): string {
  const formattedAmount = `₹${amount.toLocaleString('en-IN')}`;
  return `${docType === 'invoice' ? 'Invoice' : 'Doc'} ${docNo} from ${firmName}. Amount: ${formattedAmount}. View: ${shareUrl}`;
}

import { useState } from 'react';
import { Share2, MessageCircle, Mail, Link2, Download, MessageSquare, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  createShareToken,
  getShareUrl,
  generateWhatsAppMessage,
  generateEmailSubject,
  generateEmailBody,
  generateSmsMessage,
  ShareDocumentType,
} from '@/services/shareService';

interface ShareButtonProps {
  documentType: ShareDocumentType;
  documentId: string;
  documentNo: string;
  firmName: string;
  amount: number;
  userId: string;
  onDownloadPdf?: () => void;
  iconOnly?: boolean;
}

export default function ShareButton({
  documentType, documentId, documentNo, firmName, amount, userId, onDownloadPdf, iconOnly = false,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const getToken = async () => {
    setLoading(true);
    const token = await createShareToken(documentType, documentId, userId);
    setLoading(false);
    return token;
  };

  const handleWhatsApp = async () => {
    const token = await getToken();
    if (!token) { toast.error('Failed to generate share link'); return; }
    const url = getShareUrl(token);
    const msg = generateWhatsAppMessage(documentType, documentNo, firmName, amount, url);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    setOpen(false);
  };

  const handleEmail = async () => {
    const token = await getToken();
    if (!token) { toast.error('Failed to generate share link'); return; }
    const url = getShareUrl(token);
    const subject = generateEmailSubject(documentType, documentNo, firmName);
    const body = generateEmailBody(documentType, documentNo, firmName, amount, url);
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    setOpen(false);
  };

  const handleCopyLink = async () => {
    const token = await getToken();
    if (!token) { toast.error('Failed to generate share link'); return; }
    const url = getShareUrl(token);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSms = async () => {
    const token = await getToken();
    if (!token) { toast.error('Failed to generate share link'); return; }
    const url = getShareUrl(token);
    const msg = generateSmsMessage(documentType, documentNo, firmName, amount, url);
    window.open(`sms:?body=${encodeURIComponent(msg)}`, '_blank');
    setOpen(false);
  };

  const handleDownload = () => {
    onDownloadPdf?.();
    setOpen(false);
  };

  const options = [
    { icon: MessageCircle, label: 'WhatsApp', color: 'text-green-600', onClick: handleWhatsApp },
    { icon: Mail, label: 'Email', color: 'text-blue-600', onClick: handleEmail },
    { icon: copied ? Check : Link2, label: copied ? 'Copied!' : 'Copy Link', color: 'text-purple-600', onClick: handleCopyLink },
    { icon: MessageSquare, label: 'SMS', color: 'text-orange-600', onClick: handleSms },
    ...(onDownloadPdf ? [{ icon: Download, label: 'Download PDF', color: 'text-slate-600', onClick: handleDownload }] : []),
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-accent transition-colors ${iconOnly ? 'px-1.5' : ''}`}
        title="Share"
      >
        <Share2 className="h-3.5 w-3.5" />
        {!iconOnly && 'Share'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-lg border bg-card shadow-lg animate-fade-in">
            <div className="flex items-center justify-between p-2.5 border-b">
              <span className="text-xs font-semibold">Share Document</span>
              <button onClick={() => setOpen(false)} className="p-0.5 rounded hover:bg-muted">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-1.5">
              {loading && (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!loading && options.map((opt, i) => (
                <button
                  key={i}
                  onClick={opt.onClick}
                  className="flex items-center gap-2.5 w-full rounded-md px-2.5 py-2 text-xs hover:bg-accent transition-colors"
                >
                  <opt.icon className={`h-4 w-4 ${opt.color}`} />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

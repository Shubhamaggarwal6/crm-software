import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  details?: string[];
  highlightFields?: string[];
}

export default function ErrorDialog({ open, onClose, title = 'Kuch galat ho gaya!', message, details, highlightFields }: ErrorDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-foreground/50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card rounded-xl border-2 border-destructive/30 shadow-2xl w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="bg-destructive/10 rounded-t-xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-bold text-base text-destructive">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
            <X className="h-4 w-4 text-destructive" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <p className="text-sm leading-relaxed">{message}</p>

          {details && details.length > 0 && (
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 space-y-1.5">
              <div className="text-xs font-display font-bold text-destructive uppercase tracking-wider">Ye fields check karein:</div>
              {details.map((detail, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-destructive mt-0.5">•</span>
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          )}

          {highlightFields && highlightFields.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {highlightFields.map(field => (
                <span key={field} className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-3 py-1 text-xs font-medium border border-destructive/20">
                  ⚠️ {field}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4">
          <button onClick={onClose} className="w-full rounded-lg bg-destructive px-4 py-2.5 text-sm text-white font-display font-bold hover:bg-destructive/90 transition-colors">
            Samajh gaya, theek karta hoon
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper to get field-level error classes
export function fieldErrorClass(fieldName: string, errorFields: string[]): string {
  return errorFields.includes(fieldName)
    ? 'ring-2 ring-destructive border-destructive bg-destructive/5'
    : '';
}

import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  value: string;
  onChange: (v: string) => void;
  currentUsername?: string; // skip check for current user during edit
}

export default function UsernameChecker({ value, onChange, currentUsername }: Props) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!value || value.length < 3 || value === currentUsername) {
      setStatus('idle');
      return;
    }
    setStatus('checking');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { data } = await (supabase as any).from('employees').select('id').eq('username', value).limit(1);
      setStatus(data && data.length > 0 ? 'taken' : 'available');
    }, 500);
    return () => clearTimeout(timer.current);
  }, [value, currentUsername]);

  return (
    <div>
      <label className="text-xs text-muted-foreground">Username <span className="text-destructive">*</span></label>
      <div className="relative">
        <input
          value={value}
          onChange={e => onChange(e.target.value.toLowerCase().replace(/\s/g, ''))}
          placeholder="unique_username"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm pr-8"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {status === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {status === 'available' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          {status === 'taken' && <XCircle className="h-4 w-4 text-destructive" />}
        </div>
      </div>
      {status === 'available' && <span className="text-[10px] text-green-600">✓ Available</span>}
      {status === 'taken' && <span className="text-[10px] text-destructive">✗ Already taken</span>}
    </div>
  );
}

export function isUsernameTaken(status: string) {
  return status === 'taken';
}

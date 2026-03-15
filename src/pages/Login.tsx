import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/context/LanguageContext';
import { Lock, User, Eye, EyeOff, Mail, Building2 } from 'lucide-react';
import { Language } from '@/types';

const LANG_OPTIONS: { value: Language; flag: string }[] = [
  { value: 'en', flag: 'EN' },
  { value: 'hi', flag: 'हिं' },
  { value: 'gu', flag: 'ગુ' },
  { value: 'hinglish', flag: 'HI' },
];

type LoginMode = 'owner' | 'employee';

export default function Login() {
  const { login } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const [mode, setMode] = useState<LoginMode>('owner');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setWarning('');
    setSubmitting(true);

    try {
      const result = await login(mode, {
        email: mode === 'owner' ? email : undefined,
        username: mode === 'employee' ? username : undefined,
        password,
      });
      if (!result.success) setError(result.error || t('auth.invalidCredentials'));
      if (result.warning) setWarning(result.warning!);
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Language switcher */}
        <div className="flex justify-center gap-1 mb-6">
          {LANG_OPTIONS.map(l => (
            <button key={l.value} onClick={() => setLang(l.value)} className={`text-xs px-3 py-1 rounded font-medium transition-colors ${lang === l.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>{l.flag}</button>
          ))}
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-primary mb-4">
            <span className="text-2xl font-display font-bold text-primary-foreground">B</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">BillSaathi</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('auth.gstBillingPortal')}</p>
        </div>

        {/* Mode toggle */}
        <div className="flex mb-4 rounded-md border overflow-hidden">
          <button type="button" onClick={() => { setMode('owner'); setError(''); }} className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${mode === 'owner' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}>
            <Building2 className="h-4 w-4" /> {t('auth.loginAsOwner')}
          </button>
          <button type="button" onClick={() => { setMode('employee'); setError(''); }} className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${mode === 'employee' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}>
            <User className="h-4 w-4" /> {t('auth.loginAsEmployee')}
          </button>
        </div>

        <form onSubmit={handleLogin} className="bg-card rounded-md border shadow-sm p-8 space-y-4">
          {mode === 'owner' ? (
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" /> {t('common.email')}
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="apna@email.com" required />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <User className="h-4 w-4" /> {t('auth.username')}
              </label>
              <input value={username} onChange={e => setUsername(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder={t('auth.username')} required />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Lock className="h-4 w-4" /> {t('auth.password')}
            </label>
            <div className="relative mt-1">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder={t('auth.password')} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          {warning && <div className="rounded-md bg-warning/10 p-3 text-sm text-warning">⚠️ {warning}</div>}

          <button type="submit" disabled={submitting} className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
            {submitting ? t('common.loading') : t('auth.login')}
          </button>

          {mode === 'owner' && (
            <p className="text-xs text-muted-foreground text-center">{t('auth.noAccount')}</p>
          )}
        </form>
      </div>
    </div>
  );
}

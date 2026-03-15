import { useState, useRef } from 'react';
import { Download, Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { generateBackup, downloadImportTemplate, validateImportData, ALL_SECTIONS, ImportValidation } from '@/services/backupService';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import * as XLSX from '@e965/xlsx';

export default function BackupImportSection() {
  const { session, getCurrentUser } = useApp();
  const user = getCurrentUser();
  const [backupProgress, setBackupProgress] = useState('');
  const [backupRunning, setBackupRunning] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>([...ALL_SECTIONS]);
  const [showSections, setShowSections] = useState(false);

  // Import state
  const [importType, setImportType] = useState<'parties' | 'products' | null>(null);
  const [importValidation, setImportValidation] = useState<ImportValidation | null>(null);
  const [importFile, setImportFile] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
    if (!user) return;
    setBackupRunning(true);
    try {
      await generateBackup(
        { userId: session.userId, firmName: user.firmName || 'BillSaathi', sections: selectedSections },
        setBackupProgress
      );
      toast.success('Backup downloaded successfully!');
    } catch (e: any) {
      toast.error('Backup failed: ' + e.message);
    } finally {
      setBackupRunning(false);
      setTimeout(() => setBackupProgress(''), 3000);
    }
  };

  const toggleSection = (s: string) => {
    setSelectedSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importType) return;
    setImportFile(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      const validation = validateImportData(data, importType);
      setImportValidation(validation);
    };
    reader.readAsBinaryString(file);
  };

  const sectionLabels: Record<string, string> = {
    firm_info: '🏢 Firm Info', parties: '👥 Parties', products: '📦 Products',
    invoices: '🧾 Invoices', invoice_items: '📋 Invoice Items', payments: '💰 Payments',
    purchases: '🛒 Purchases', purchase_items: '📋 Purchase Items', suppliers: '🏭 Suppliers',
    expenses: '💸 Expenses', expense_categories: '📂 Expense Categories',
    credit_notes: '📝 Credit Notes', credit_note_items: '📋 CN Items', debit_notes: '📝 Debit Notes',
    bank_ledger: '🏦 Bank Ledger', stock_movements: '📊 Stock Movements',
    employees: '👷 Employees', settings: '⚙️ Settings',
    delivery_challans: '🚚 Delivery Challans', activity_logs: '📜 Activity Logs',
  };

  return (
    <div className="space-y-4">
      {/* BACKUP */}
      <div className="hero-card space-y-3">
        <h3 className="font-display font-semibold text-sm flex items-center gap-1.5">
          <Download className="h-4 w-4" /> Data Backup
        </h3>
        <p className="text-xs text-muted-foreground">Download your complete business data as an Excel file.</p>

        <button onClick={() => setShowSections(!showSections)} className="text-xs text-primary flex items-center gap-1">
          {showSections ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Selective Backup ({selectedSections.length}/{ALL_SECTIONS.length} sections)
        </button>

        {showSections && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
            {ALL_SECTIONS.map(s => (
              <label key={s} className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" checked={selectedSections.includes(s)} onChange={() => toggleSection(s)} className="rounded" />
                {sectionLabels[s] || s}
              </label>
            ))}
          </div>
        )}

        <button onClick={handleBackup} disabled={backupRunning || !selectedSections.length} className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50">
          {backupRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {backupRunning ? backupProgress || 'Preparing...' : 'Download Complete Backup'}
        </button>
      </div>

      {/* IMPORT */}
      <div className="hero-card space-y-3">
        <h3 className="font-display font-semibold text-sm flex items-center gap-1.5">
          <Upload className="h-4 w-4" /> Data Import
        </h3>
        <p className="text-xs text-muted-foreground">Import data from other billing apps (Tally, Vyapar, Busy etc).</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {([
            { type: 'parties' as const, label: '👥 Import Parties', desc: 'Customers & Suppliers' },
            { type: 'products' as const, label: '📦 Import Products', desc: 'With stock & pricing' },
          ]).map(({ type, label, desc }) => (
            <div key={type} className="rounded-lg border p-3 space-y-2">
              <div className="font-medium text-xs">{label}</div>
              <div className="text-[10px] text-muted-foreground">{desc}</div>
              <div className="flex gap-1.5">
                <button onClick={() => downloadImportTemplate(type)} className="text-[10px] text-primary flex items-center gap-0.5 hover:underline">
                  <FileSpreadsheet className="h-3 w-3" /> Template
                </button>
                <button onClick={() => { setImportType(type); setImportValidation(null); setImportFile(''); fileRef.current?.click(); }} className="text-[10px] text-primary flex items-center gap-0.5 hover:underline">
                  <Upload className="h-3 w-3" /> Upload
                </button>
              </div>
            </div>
          ))}
          {(['stock', 'balances', 'invoices'] as const).map(type => (
            <div key={type} className="rounded-lg border p-3 space-y-2">
              <div className="font-medium text-xs capitalize">📋 {type === 'stock' ? 'Opening Stock' : type === 'balances' ? 'Opening Balances' : 'Historical Invoices'}</div>
              <button onClick={() => downloadImportTemplate(type)} className="text-[10px] text-primary flex items-center gap-0.5 hover:underline">
                <FileSpreadsheet className="h-3 w-3" /> Download Template
              </button>
            </div>
          ))}
        </div>

        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />

        {/* Validation Preview */}
        {importValidation && (
          <div className="rounded-lg border p-3 space-y-2 animate-fade-in">
            <div className="font-medium text-sm">Import Preview — {importFile}</div>
            <div className="flex gap-3 text-xs">
              <span>Total: {importValidation.totalRows}</span>
              <span className="text-green-600 flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> Valid: {importValidation.validRows.length}</span>
              <span className="text-destructive flex items-center gap-0.5"><XCircle className="h-3 w-3" /> Errors: {importValidation.errorRows.length}</span>
            </div>
            {importValidation.errorRows.length > 0 && (
              <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                {importValidation.errorRows.slice(0, 10).map(e => (
                  <div key={e.row} className="text-destructive">Row {e.row}: {e.errors.join(', ')}</div>
                ))}
              </div>
            )}
            {importValidation.validRows.length > 0 && (
              <button onClick={() => { toast.success(`${importValidation.validRows.length} records ready to import. Feature completing soon!`); setImportValidation(null); }} className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">
                Import {importValidation.validRows.length} Valid Rows
              </button>
            )}
          </div>
        )}
      </div>

      {/* Export for Migration */}
      <div className="hero-card space-y-3">
        <h3 className="font-display font-semibold text-sm flex items-center gap-1.5">
          <FileSpreadsheet className="h-4 w-4" /> Export for Migration
        </h3>
        <p className="text-xs text-muted-foreground">Export data compatible with other billing apps.</p>
        <div className="flex flex-wrap gap-2">
          {['Standard CSV', 'Tally Format', 'Vyapar Format'].map(fmt => (
            <button key={fmt} onClick={() => toast.info(`${fmt} export coming soon!`)} className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent">
              <Download className="h-3 w-3 inline mr-1" /> {fmt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

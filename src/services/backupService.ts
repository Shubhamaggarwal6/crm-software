import * as XLSX from '@e965/xlsx';
import { supabase } from '@/integrations/supabase/client';

interface BackupOptions {
  userId: string;
  firmName: string;
  sections?: string[];
}

const ALL_SECTIONS = [
  'firm_info', 'parties', 'products', 'invoices', 'invoice_items',
  'payments', 'purchases', 'purchase_items', 'suppliers', 'expenses',
  'expense_categories', 'credit_notes', 'credit_note_items', 'debit_notes',
  'bank_ledger', 'stock_movements', 'employees', 'settings',
  'delivery_challans', 'activity_logs',
];

async function fetchTable(table: string, userId: string, limit = 5000) {
  const { data } = await (supabase as any).from(table).select('*').eq('user_id', userId).limit(limit);
  return data || [];
}

function addSheetToWorkbook(wb: XLSX.WorkBook, data: any[], sheetName: string, firmName: string, date: string) {
  if (!data.length) {
    const ws = XLSX.utils.aoa_to_sheet([[`${firmName} — Export: ${date}`], [], ['No data']]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    return;
  }
  const headers = Object.keys(data[0]);
  const rows = [
    [`${firmName} — Export: ${date}`],
    [],
    headers,
    ...data.map(r => headers.map(h => r[h] ?? '')),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  // Bold header row (row 3, 0-indexed = 2)
  headers.forEach((_, i) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 2, c: i })];
    if (cell) cell.s = { font: { bold: true } };
  });
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
}

export async function generateBackup(opts: BackupOptions, onProgress?: (msg: string) => void) {
  const { userId, firmName } = opts;
  const sections = opts.sections?.length ? opts.sections : ALL_SECTIONS;
  const date = new Date().toLocaleDateString('en-IN');
  const wb = XLSX.utils.book_new();

  const tableMap: Record<string, { table: string; sheet: string }> = {
    firm_info: { table: 'owner_profiles', sheet: 'Firm Info' },
    parties: { table: 'customers', sheet: 'Parties' },
    products: { table: 'products', sheet: 'Products' },
    invoices: { table: 'invoices', sheet: 'Invoices' },
    invoice_items: { table: 'invoice_items', sheet: 'Invoice Items' },
    payments: { table: 'payments', sheet: 'Payments' },
    purchases: { table: 'purchases', sheet: 'Purchases' },
    purchase_items: { table: 'purchase_items', sheet: 'Purchase Items' },
    suppliers: { table: 'suppliers', sheet: 'Suppliers' },
    expenses: { table: 'expenses', sheet: 'Expenses' },
    expense_categories: { table: 'expense_categories', sheet: 'Expense Categories' },
    credit_notes: { table: 'credit_notes', sheet: 'Credit Notes' },
    credit_note_items: { table: 'credit_note_items', sheet: 'Credit Note Items' },
    debit_notes: { table: 'debit_notes', sheet: 'Debit Notes' },
    bank_ledger: { table: 'bank_ledger_entries', sheet: 'Bank Ledger' },
    stock_movements: { table: 'stock_movements', sheet: 'Stock Movements' },
    employees: { table: 'employees', sheet: 'Employees' },
    settings: { table: 'settings', sheet: 'Settings' },
    delivery_challans: { table: 'delivery_challans', sheet: 'Delivery Challans' },
    activity_logs: { table: 'activity_logs', sheet: 'Activity Logs' },
  };

  // For firm_info, fetch by id not user_id
  let firmData: any[] = [];
  if (sections.includes('firm_info')) {
    onProgress?.('Fetching firm info...');
    const { data } = await (supabase as any).from('owner_profiles').select('*').eq('id', userId).limit(1);
    firmData = data || [];
  }

  let sheetCount = 0;
  for (const sec of sections) {
    const mapping = tableMap[sec];
    if (!mapping) continue;
    sheetCount++;
    onProgress?.(`Writing sheet ${sheetCount}...`);

    let data: any[];
    if (sec === 'firm_info') {
      data = firmData;
    } else if (sec === 'activity_logs') {
      const { data: d } = await (supabase as any).from(mapping.table).select('*').eq('owner_id', userId).limit(5000);
      data = d || [];
    } else if (sec === 'employees') {
      const { data: d } = await (supabase as any).from(mapping.table).select('id, name, username, phone, email, active, permissions, created_at').eq('owner_id', userId);
      data = d || [];
    } else {
      data = await fetchTable(mapping.table, userId);
    }

    addSheetToWorkbook(wb, data, mapping.sheet, firmName, date);
  }

  onProgress?.('Finalizing file...');
  const safeName = firmName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const dateStr = new Date().toLocaleDateString('en-IN').replace(/\//g, '');
  const fileName = `BillSaathi_Backup_${safeName}_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
  onProgress?.('Download started!');
  return fileName;
}

// Import templates
export function downloadImportTemplate(type: 'parties' | 'products' | 'stock' | 'balances' | 'invoices') {
  const templates: Record<string, { headers: string[]; sample: any[]; sheet: string }> = {
    parties: {
      sheet: 'Parties Import',
      headers: ['Name*', 'Phone', 'Alternate Phone', 'Email', 'GSTIN', 'PAN', 'Party Type (Customer/Supplier/Both)', 'Street', 'City', 'PIN', 'State', 'Opening Balance', 'Credit Limit', 'Payment Terms'],
      sample: [{ 'Name*': 'Raj Traders', Phone: '9876543210', 'Alternate Phone': '', Email: 'raj@test.com', GSTIN: '27AABCU1234C1Z5', PAN: 'AABCU1234C', 'Party Type (Customer/Supplier/Both)': 'Customer', Street: 'MG Road', City: 'Mumbai', PIN: '400001', State: 'Maharashtra', 'Opening Balance': 5000, 'Credit Limit': 50000, 'Payment Terms': 'Net 30' }],
    },
    products: {
      sheet: 'Products Import',
      headers: ['Name*', 'HSN Code', 'Category', 'Brand', 'Unit*', 'Selling Unit Type (Loose/Carton/Both)', 'Pieces Per Carton', 'Carton Unit Name', 'MRP*', 'Selling Price*', 'Purchase Price', 'GST Rate*', 'Opening Stock', 'Min Stock Level', 'Storage Location'],
      sample: [{ 'Name*': 'Tata Salt 1kg', 'HSN Code': '2501', Category: 'Grocery', Brand: 'Tata', 'Unit*': 'Pcs', 'Selling Unit Type (Loose/Carton/Both)': 'Both', 'Pieces Per Carton': 24, 'Carton Unit Name': 'Carton', 'MRP*': 28, 'Selling Price*': 25, 'Purchase Price': 20, 'GST Rate*': 5, 'Opening Stock': 240, 'Min Stock Level': 48, 'Storage Location': 'Rack A' }],
    },
    stock: {
      sheet: 'Opening Stock',
      headers: ['Product Name*', 'Opening Stock Quantity*', 'As On Date (DD/MM/YYYY)'],
      sample: [{ 'Product Name*': 'Tata Salt 1kg', 'Opening Stock Quantity*': 240, 'As On Date (DD/MM/YYYY)': '01/04/2025' }],
    },
    balances: {
      sheet: 'Opening Balances',
      headers: ['Party Name*', 'Opening Balance Amount*', 'As On Date (DD/MM/YYYY)', 'Type (Receivable/Payable)'],
      sample: [{ 'Party Name*': 'Raj Traders', 'Opening Balance Amount*': 5000, 'As On Date (DD/MM/YYYY)': '01/04/2025', 'Type (Receivable/Payable)': 'Receivable' }],
    },
    invoices: {
      sheet: 'Historical Invoices',
      headers: ['Invoice Number*', 'Invoice Date (DD/MM/YYYY)*', 'Party Name*', 'Total Amount*', 'Tax Amount', 'Status (Paid/Unpaid)'],
      sample: [{ 'Invoice Number*': 'OLD-001', 'Invoice Date (DD/MM/YYYY)*': '15/01/2025', 'Party Name*': 'Raj Traders', 'Total Amount*': 15000, 'Tax Amount': 2700, 'Status (Paid/Unpaid)': 'Paid' }],
    },
  };

  const t = templates[type];
  const ws = XLSX.utils.json_to_sheet(t.sample);
  // Add description row
  const descRow = t.headers.map(h => h.includes('*') ? 'Required' : 'Optional');
  XLSX.utils.sheet_add_aoa(ws, [descRow], { origin: 'A2' });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t.sheet);
  XLSX.writeFile(wb, `BillSaathi_${type}_template.xlsx`);
}

export interface ImportValidation {
  totalRows: number;
  validRows: any[];
  errorRows: { row: number; errors: string[] }[];
}

export function validateImportData(data: any[], type: 'parties' | 'products'): ImportValidation {
  const result: ImportValidation = { totalRows: data.length, validRows: [], errorRows: [] };

  data.forEach((row, idx) => {
    const errors: string[] = [];
    if (type === 'parties') {
      if (!row['Name*'] && !row['Name']) errors.push('Name is required');
    } else if (type === 'products') {
      if (!row['Name*'] && !row['Name']) errors.push('Name is required');
      if (!row['MRP*'] && !row['MRP'] && row['MRP*'] !== 0) errors.push('MRP is required');
      if (!row['Selling Price*'] && !row['Selling Price'] && row['Selling Price*'] !== 0) errors.push('Selling Price is required');
      if (!row['GST Rate*'] && !row['GST Rate'] && row['GST Rate*'] !== 0) errors.push('GST Rate is required');
    }

    if (errors.length) {
      result.errorRows.push({ row: idx + 2, errors });
    } else {
      result.validRows.push(row);
    }
  });

  return result;
}

export { ALL_SECTIONS };

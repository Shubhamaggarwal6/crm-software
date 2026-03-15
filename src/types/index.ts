export type Role = 'admin' | 'user' | 'employee';
export type PlanType = 'Basic' | 'Pro' | 'Enterprise';
export type InvoiceStatus = 'Paid' | 'Pending' | 'Partial';
export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'RTGS';
export type SubStatus = 'active' | 'warning' | 'critical' | 'expired';
export type Language = 'en' | 'hi' | 'gu' | 'hinglish';

export interface EmployeePermissions {
  createInvoice: boolean;
  addCustomer: boolean;
  addProduct: boolean;
  viewReports: boolean;
  viewCustomerProfile: boolean;
  editInvoiceStatus: boolean;
  addPayment: boolean;
  viewStock: boolean;
  viewPurchases: boolean;
}

export const defaultPermissions: EmployeePermissions = {
  createInvoice: false,
  addCustomer: false,
  addProduct: false,
  viewReports: false,
  viewCustomerProfile: false,
  editInvoiceStatus: false,
  addPayment: false,
  viewStock: false,
  viewPurchases: false,
};

export interface User {
  id: string;
  username: string;
  password: string;
  firmName: string;
  gstNumber: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pin?: string;
  plan: PlanType;
  maxEmployees: number;
  subscriptionStart: string;
  subscriptionEnd: string;
  active: boolean;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  branch?: string;
  invoicePrefix?: string;
  showStockToEmployees?: boolean;
  termsAndConditions?: string;
}

export interface Employee {
  id: string;
  userId: string;
  name: string;
  username: string;
  password: string;
  active: boolean;
  createdAt: string;
  permissions: EmployeePermissions;
  lastActive?: string;
}

export interface Customer {
  id: string;
  userId: string;
  name: string;
  phone: string;
  altPhone?: string;
  email?: string;
  gstNumber?: string;
  pan?: string;
  address?: string;
  area?: string;
  city?: string;
  pin?: string;
  state?: string;
  stateCode?: string;
  type?: string;
  openingBalance?: number;
  creditLimit?: number;
  paymentTerms?: string;
  customerSince?: string;
  notes?: string;
  tags?: string;
  createdAt: string;
}

export type SellingUnitType = 'loose' | 'carton' | 'both';

export interface Product {
  id: string;
  userId: string;
  name: string;
  hsn: string;
  category?: string;
  brand?: string;
  description?: string;
  barcode?: string;
  price: number;
  sellingPrice?: number;
  purchasePrice?: number;
  gstRate: number;
  cess?: number;
  unit: string;
  stock: number;
  minStock?: number;
  storageLocation?: string;
  // Carton/Loose fields
  sellingUnitType: SellingUnitType;
  cartonUnitName?: string;
  piecesPerCarton?: number;
  cartonMrp?: number;
  cartonSellingPrice?: number;
  cartonPurchasePrice?: number;
  cartonBarcode?: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  hsn: string;
  qty: number;
  unit: string;
  mrp: number;
  sellingPrice: number;
  discount: number;
  taxableAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  // Carton/Loose fields
  selectedUnit?: 'loose' | 'carton';
  quantityInCartons?: number;
  quantityInLoose?: number;
  totalLooseUnits?: number;
  unitPriceUsed?: number;
  cartonUnitName?: string;
  piecesPerCarton?: number;
}

export interface InvoiceCharge {
  chargeName: string;
  amount: number;
  withGst: boolean;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  userId: string;
  date: string;
  customerId: string;
  customerName: string;
  customerGst?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerState?: string;
  customerStateCode?: string;
  vehicleNo?: string;
  items: InvoiceItem[];
  subtotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalDiscount: number;
  roundOff: number;
  grandTotal: number;
  status: InvoiceStatus;
  paymentMode?: PaymentMode;
  amountPaid?: number;
  createdBy: {
    id: string;
    name: string;
    role: Role;
    timestamp: string;
  };
  isInterState: boolean;
  // Invoice-level discount
  invoiceDiscountAmount?: number;
  invoiceDiscountPercent?: number;
  invoiceDiscountType?: 'none' | 'before_tax' | 'after_tax';
  // Other charges
  otherCharges?: InvoiceCharge[];
  otherChargesTotal?: number;
}

export type PaymentModeExtended = 'Cash' | 'UPI' | 'NEFT' | 'RTGS' | 'IMPS' | 'Cheque' | 'Bank Transfer';

export interface Payment {
  id: string;
  receiptNo: string;
  userId: string;
  customerId?: string;
  supplierId?: string;
  invoiceId?: string;
  invoiceNo?: string;
  purchaseNo?: string;
  amount: number;
  date: string;
  mode: PaymentModeExtended;
  reference?: string;
  upiTransactionId?: string;
  bankRefNo?: string;
  bankName?: string;
  utrNumber?: string;
  impsRefNo?: string;
  chequeNo?: string;
  chequeDate?: string;
  chequeBranch?: string;
  receivedBy?: string;
  note?: string;
}

export interface Supplier {
  id: string;
  userId: string;
  name: string;
  phone: string;
  altPhone?: string;
  email?: string;
  gstNumber?: string;
  pan?: string;
  supplierCode?: string;
  address?: string;
  city?: string;
  pin?: string;
  state?: string;
  stateCode?: string;
  country?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  branch?: string;
  openingBalance?: number;
  creditLimit?: number;
  paymentTerms?: string;
  supplierSince?: string;
  category?: string;
  notes?: string;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  hsn: string;
  qty: number;
  unit: string;
  purchaseRate: number;
  discount: number;
  taxableAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  // Carton/Loose fields
  selectedUnit?: 'loose' | 'carton';
  quantityInCartons?: number;
  quantityInLoose?: number;
  totalLooseUnits?: number;
  unitPriceUsed?: number;
  cartonUnitName?: string;
  piecesPerCarton?: number;
}

export interface Purchase {
  id: string;
  purchaseNo: string;
  userId: string;
  supplierId: string;
  supplierName: string;
  supplierGst?: string;
  supplierInvoiceNo: string;
  date: string;
  dueDate?: string;
  placeOfSupply?: string;
  items: PurchaseItem[];
  subtotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalDiscount: number;
  roundOff: number;
  grandTotal: number;
  amountPaid: number;
  status: 'Paid' | 'Partial' | 'Unpaid';
  isInterState: boolean;
  notes?: string;
  createdAt: string;
}

export interface CreditNote {
  id: string;
  creditNoteNo: string;
  userId: string;
  invoiceId: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  date: string;
  reason: 'Goods Returned' | 'Price Correction' | 'Discount Granted' | 'Tax Correction' | 'Other';
  items: InvoiceItem[];
  subtotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  netAmount: number;
  goodsReturned: boolean;
  notes?: string;
  status: 'Pending' | 'Adjusted';
  createdAt: string;
}

export interface DebitNote {
  id: string;
  debitNoteNo: string;
  userId: string;
  type: 'customer' | 'supplier';
  customerId?: string;
  customerName?: string;
  supplierId?: string;
  supplierName?: string;
  invoiceNo?: string;
  supplierRefNo?: string;
  date: string;
  reason: 'Price Increase' | 'Short Supply' | 'Additional Charges' | 'Interest on Late Payment' | 'Other';
  description?: string;
  amount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  netAmount: number;
  notes?: string;
  status: 'Pending' | 'Adjusted';
  createdAt: string;
}

export interface BankAccount {
  id: string;
  userId: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branchName?: string;
  accountType: 'Current' | 'Savings' | 'OD Account';
  upiId?: string;
  qrCodeLabel?: string;
  isDefault: boolean;
  displayLabel?: string;
}

export interface LedgerEntry {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  options?: ChatOption[];
  suggestions?: any[];
  type?: 'text' | 'options' | 'input' | 'summary' | 'invoice-preview';
}

export interface ChatOption {
  label: string;
  value: string;
  icon?: string;
}

export interface AppSession {
  loggedIn: boolean;
  role: Role;
  userId: string;
  employeeId?: string;
}

export function getSubscriptionStatus(endDate: string): { status: SubStatus; color: string; label: string; daysLeft: number } {
  const today = new Date();
  const end = new Date(endDate);
  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { status: 'expired', color: '#94A3B8', label: 'Expired', daysLeft };
  if (daysLeft <= 7) return { status: 'critical', color: '#EF4444', label: `${daysLeft} din bache`, daysLeft };
  if (daysLeft <= 30) return { status: 'warning', color: '#F59E0B', label: `${daysLeft} din bache`, daysLeft };
  return { status: 'active', color: '#22C55E', label: `${daysLeft} din bache`, daysLeft };
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const scales = ['','Thousand','Lakh','Crore'];
  const n = Math.round(num);
  if (n === 0) return 'Zero Rupees Only';
  function convertGroup(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
    return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + convertGroup(n%100) : '');
  }
  const parts: number[] = [];
  let remaining = n;
  parts.push(remaining % 1000); remaining = Math.floor(remaining / 1000);
  while (remaining > 0) {
    parts.push(remaining % 100); remaining = Math.floor(remaining / 100);
  }
  let result = '';
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] === 0) continue;
    result += convertGroup(parts[i]) + ' ' + scales[i] + ' ';
  }
  return result.trim() + ' Rupees Only';
}

export const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' }, { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' }, { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' }, { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' }, { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' }, { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' }, { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' }, { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' }, { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' }, { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' }, { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' }, { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' }, { code: '24', name: 'Gujarat' },
  { code: '25', name: 'Daman & Diu' }, { code: '26', name: 'Dadra & Nagar Haveli' },
  { code: '27', name: 'Maharashtra' }, { code: '28', name: 'Andhra Pradesh (Old)' },
  { code: '29', name: 'Karnataka' }, { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' }, { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' }, { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar' }, { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' }, { code: '38', name: 'Ladakh' },
];

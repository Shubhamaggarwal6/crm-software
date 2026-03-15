import { User, Employee, Customer, Product, Invoice, Payment, Supplier, Purchase, CreditNote, DebitNote, BankAccount, defaultPermissions } from '@/types';

const today = new Date();
const fiveDaysFromNow = new Date(today); fiveDaysFromNow.setDate(today.getDate() + 5);
const twoHundredDaysFromNow = new Date(today); twoHundredDaysFromNow.setDate(today.getDate() + 200);
const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(today.getDate() - 30);
const oneYearAgo = new Date(today); oneYearAgo.setFullYear(today.getFullYear() - 1);
const tenDaysAgo = new Date(today); tenDaysAgo.setDate(today.getDate() - 10);
const fiveDaysAgo = new Date(today); fiveDaysAgo.setDate(today.getDate() - 5);
const threeDaysAgo = new Date(today); threeDaysAgo.setDate(today.getDate() - 3);
const oneDayAgo = new Date(today); oneDayAgo.setDate(today.getDate() - 1);

function fmt(d: Date) { return d.toISOString().split('T')[0]; }

export const MASTER_KEY = 'BILLSAATHI2024';

export const initialUsers: User[] = [
  {
    id: 'user1', username: 'ravi', password: 'ravi123', firmName: 'Ravi Traders',
    gstNumber: '07AABCU9603R1ZX', email: 'ravi@traders.com', phone: '9876543210',
    address: 'Shop No. 12, Lajpat Nagar', city: 'New Delhi', state: 'Delhi', stateCode: '07', pin: '110024',
    plan: 'Pro', maxEmployees: 5, subscriptionStart: fmt(thirtyDaysAgo), subscriptionEnd: fmt(fiveDaysFromNow),
    active: true, bankName: 'State Bank of India', accountNumber: '123456789012', ifsc: 'SBIN0001234', branch: 'Lajpat Nagar',
    invoicePrefix: 'RT', showStockToEmployees: true,
    termsAndConditions: '1. Goods once sold will not be taken back.\n2. Subject to Delhi jurisdiction.\n3. E&OE',
  },
  {
    id: 'user2', username: 'amit', password: 'amit123', firmName: 'Amit Electronics',
    gstNumber: '24AABCU9603R1ZY', email: 'amit@electronics.com', phone: '9988776655',
    address: '45, MG Road', city: 'Ahmedabad', state: 'Gujarat', stateCode: '24', pin: '380001',
    plan: 'Enterprise', maxEmployees: 10, subscriptionStart: fmt(oneYearAgo), subscriptionEnd: fmt(twoHundredDaysFromNow),
    active: true, bankName: 'HDFC Bank', accountNumber: '987654321098', ifsc: 'HDFC0001234', branch: 'MG Road Branch',
    invoicePrefix: 'AE', showStockToEmployees: false,
    termsAndConditions: '1. Goods once sold will not be taken back.\n2. Subject to Ahmedabad jurisdiction.',
  },
];

export const initialEmployees: Employee[] = [
  { id: 'emp1', userId: 'user1', name: 'Suresh Kumar', username: 'suresh', password: 'suresh123', active: true, createdAt: fmt(tenDaysAgo), permissions: { ...defaultPermissions, createInvoice: true, addCustomer: true, viewStock: true } },
  { id: 'emp2', userId: 'user1', name: 'Mohan Lal', username: 'mohan', password: 'mohan123', active: true, createdAt: fmt(tenDaysAgo), permissions: { ...defaultPermissions, createInvoice: true } },
  { id: 'emp3', userId: 'user2', name: 'Kiran Patel', username: 'kiran', password: 'kiran123', active: true, createdAt: fmt(tenDaysAgo), permissions: { ...defaultPermissions, createInvoice: true, addCustomer: true, addProduct: true, viewStock: true, viewPurchases: true } },
];

export const initialCustomers: Customer[] = [
  { id: 'cust1', userId: 'user1', name: 'Ajay Kumar', phone: '9111222333', gstNumber: '07AABCU1234R1ZA', address: 'Karol Bagh, Delhi', state: 'Delhi', stateCode: '07', type: 'Wholesale', createdAt: '2024-01-15' },
  { id: 'cust2', userId: 'user1', name: 'Priya Sharma', phone: '9222333444', address: 'Dwarka, Delhi', state: 'Delhi', stateCode: '07', type: 'Retail', createdAt: '2024-02-10' },
  { id: 'cust3', userId: 'user1', name: 'Rahul Singh', phone: '9333444555', gstNumber: '09AABCU5678R1ZB', address: 'Lucknow', state: 'Uttar Pradesh', stateCode: '09', type: 'Wholesale', createdAt: '2024-03-05' },
  { id: 'cust4', userId: 'user2', name: 'Vijay Patel', phone: '9444555666', gstNumber: '24AABCU9012R1ZC', address: 'CG Road, Ahmedabad', state: 'Gujarat', stateCode: '24', type: 'Wholesale', createdAt: '2024-01-20' },
  { id: 'cust5', userId: 'user2', name: 'Meena Ben', phone: '9555666777', address: 'Maninagar, Ahmedabad', state: 'Gujarat', stateCode: '24', type: 'Retail', createdAt: '2024-04-01' },
];

export const initialProducts: Product[] = [
  { id: 'prod1', userId: 'user1', name: 'LED Bulb 9W', hsn: '8539', price: 85, gstRate: 12, unit: 'Pcs', stock: 500, minStock: 50, sellingUnitType: 'loose' },
  { id: 'prod2', userId: 'user1', name: 'Wire 1.5mm (Roll)', hsn: '8544', price: 650, gstRate: 18, unit: 'Roll', stock: 100, minStock: 10, sellingUnitType: 'loose' },
  { id: 'prod3', userId: 'user1', name: 'Switch Board 6-Way', hsn: '8536', price: 220, gstRate: 18, unit: 'Pcs', stock: 200, minStock: 20, sellingUnitType: 'loose' },
  { id: 'prod4', userId: 'user1', name: 'MCB 32A', hsn: '8536', price: 180, gstRate: 18, unit: 'Pcs', stock: 150, minStock: 15, sellingUnitType: 'loose' },
  { id: 'prod5', userId: 'user1', name: 'Ceiling Fan', hsn: '8414', price: 1800, gstRate: 18, unit: 'Pcs', stock: 30, minStock: 5, sellingUnitType: 'loose' },
  { id: 'prod6', userId: 'user2', name: 'Samsung TV 43"', hsn: '8528', price: 32000, gstRate: 28, unit: 'Pcs', stock: 15, minStock: 3, sellingUnitType: 'loose' },
  { id: 'prod7', userId: 'user2', name: 'Washing Machine', hsn: '8450', price: 18000, gstRate: 28, unit: 'Pcs', stock: 10, minStock: 2, sellingUnitType: 'loose' },
  { id: 'prod8', userId: 'user2', name: 'LED Tube Light', hsn: '8539', price: 120, gstRate: 12, unit: 'Pcs', stock: 300, minStock: 30, sellingUnitType: 'loose' },
];

export const initialInvoices: Invoice[] = [
  {
    id: 'inv1', invoiceNo: 'RT-2024-0001', userId: 'user1', date: fmt(fiveDaysAgo),
    customerId: 'cust1', customerName: 'Ajay Kumar', customerGst: '07AABCU1234R1ZA', customerPhone: '9111222333', customerAddress: 'Karol Bagh, Delhi', customerState: 'Delhi', customerStateCode: '07',
    vehicleNo: 'DL01AB1234',
    items: [
      { productId: 'prod1', productName: 'LED Bulb 9W', hsn: '8539', qty: 10, unit: 'Pcs', mrp: 85, sellingPrice: 85, discount: 0, taxableAmount: 850, gstRate: 12, cgst: 51, sgst: 51, igst: 0, total: 952 },
      { productId: 'prod2', productName: 'Wire 1.5mm (Roll)', hsn: '8544', qty: 2, unit: 'Roll', mrp: 650, sellingPrice: 650, discount: 0, taxableAmount: 1300, gstRate: 18, cgst: 117, sgst: 117, igst: 0, total: 1534 },
    ],
    subtotal: 2150, totalCgst: 168, totalSgst: 168, totalIgst: 0, totalDiscount: 0, roundOff: 0.36, grandTotal: 2487,
    status: 'Paid', paymentMode: 'UPI',
    createdBy: { id: 'user1', name: 'Ravi Traders', role: 'user', timestamp: fiveDaysAgo.toISOString() },
    isInterState: false,
  },
  {
    id: 'inv2', invoiceNo: 'RT-2024-0002', userId: 'user1', date: fmt(threeDaysAgo),
    customerId: 'cust3', customerName: 'Rahul Singh', customerGst: '09AABCU5678R1ZB', customerPhone: '9333444555', customerAddress: 'Lucknow', customerState: 'Uttar Pradesh', customerStateCode: '09',
    items: [
      { productId: 'prod5', productName: 'Ceiling Fan', hsn: '8414', qty: 3, unit: 'Pcs', mrp: 1800, sellingPrice: 1700, discount: 100, taxableAmount: 5100, gstRate: 18, cgst: 0, sgst: 0, igst: 918, total: 6018 },
    ],
    subtotal: 5100, totalCgst: 0, totalSgst: 0, totalIgst: 918, totalDiscount: 300, roundOff: 0.18, grandTotal: 6018,
    status: 'Pending',
    createdBy: { id: 'emp1', name: 'Suresh Kumar', role: 'employee', timestamp: threeDaysAgo.toISOString() },
    isInterState: true,
  },
  {
    id: 'inv3', invoiceNo: 'RT-2024-0003', userId: 'user1', date: fmt(oneDayAgo),
    customerId: 'cust2', customerName: 'Priya Sharma', customerPhone: '9222333444', customerAddress: 'Dwarka, Delhi', customerState: 'Delhi', customerStateCode: '07',
    items: [
      { productId: 'prod3', productName: 'Switch Board 6-Way', hsn: '8536', qty: 5, unit: 'Pcs', mrp: 220, sellingPrice: 200, discount: 20, taxableAmount: 1000, gstRate: 18, cgst: 90, sgst: 90, igst: 0, total: 1180 },
    ],
    subtotal: 1000, totalCgst: 90, totalSgst: 90, totalIgst: 0, totalDiscount: 100, roundOff: 0, grandTotal: 1180,
    status: 'Partial', paymentMode: 'Cash', amountPaid: 500,
    createdBy: { id: 'user1', name: 'Ravi Traders', role: 'user', timestamp: oneDayAgo.toISOString() },
    isInterState: false,
  },
];

export const initialPayments: Payment[] = [
  { id: 'pay1', receiptNo: 'RCPT-2024-0001', userId: 'user1', customerId: 'cust1', invoiceNo: 'RT-2024-0001', amount: 2487, date: fmt(fiveDaysAgo), mode: 'UPI', upiTransactionId: 'UPI123456', reference: 'UPI123456', note: 'Full payment' },
  { id: 'pay2', receiptNo: 'RCPT-2024-0002', userId: 'user1', customerId: 'cust2', invoiceNo: 'RT-2024-0003', amount: 500, date: fmt(oneDayAgo), mode: 'Cash', note: 'Partial payment' },
];

export const initialSuppliers: Supplier[] = [
  { id: 'sup1', userId: 'user1', name: 'Havells India Ltd', phone: '9800111222', gstNumber: '07AABCH0001R1ZZ', address: '10, Industrial Area', city: 'Delhi', state: 'Delhi', stateCode: '07', category: 'Electrical', supplierSince: '2023-01-01', createdAt: '2023-01-01' },
  { id: 'sup2', userId: 'user1', name: 'Finolex Cables', phone: '9800333444', gstNumber: '27AABCF0002R1ZY', address: '20, MIDC', city: 'Pune', state: 'Maharashtra', stateCode: '27', category: 'Cables', supplierSince: '2023-06-15', createdAt: '2023-06-15' },
  { id: 'sup3', userId: 'user2', name: 'Samsung India', phone: '9800555666', gstNumber: '33AABCS0003R1ZX', address: '100, OMR', city: 'Chennai', state: 'Tamil Nadu', stateCode: '33', category: 'Electronics', supplierSince: '2023-03-01', createdAt: '2023-03-01' },
];

export const initialPurchases: Purchase[] = [
  {
    id: 'pur1', purchaseNo: 'PUR-2024-0001', userId: 'user1', supplierId: 'sup1', supplierName: 'Havells India Ltd', supplierGst: '07AABCH0001R1ZZ',
    supplierInvoiceNo: 'HAV/2024/1234', date: fmt(tenDaysAgo), dueDate: fmt(fiveDaysFromNow),
    items: [
      { productId: 'prod1', productName: 'LED Bulb 9W', hsn: '8539', qty: 100, unit: 'Pcs', purchaseRate: 55, discount: 0, taxableAmount: 5500, gstRate: 12, cgst: 330, sgst: 330, igst: 0, total: 6160 },
    ],
    subtotal: 5500, totalCgst: 330, totalSgst: 330, totalIgst: 0, totalDiscount: 0, roundOff: 0, grandTotal: 6160,
    amountPaid: 6160, status: 'Paid', isInterState: false, createdAt: fmt(tenDaysAgo),
  },
  {
    id: 'pur2', purchaseNo: 'PUR-2024-0002', userId: 'user1', supplierId: 'sup2', supplierName: 'Finolex Cables', supplierGst: '27AABCF0002R1ZY',
    supplierInvoiceNo: 'FIN/2024/5678', date: fmt(fiveDaysAgo),
    items: [
      { productId: 'prod2', productName: 'Wire 1.5mm (Roll)', hsn: '8544', qty: 20, unit: 'Roll', purchaseRate: 450, discount: 0, taxableAmount: 9000, gstRate: 18, cgst: 0, sgst: 0, igst: 1620, total: 10620 },
    ],
    subtotal: 9000, totalCgst: 0, totalSgst: 0, totalIgst: 1620, totalDiscount: 0, roundOff: 0, grandTotal: 10620,
    amountPaid: 5000, status: 'Partial', isInterState: true, createdAt: fmt(fiveDaysAgo),
  },
];

export const initialCreditNotes: CreditNote[] = [];
export const initialDebitNotes: DebitNote[] = [];

export const initialBankAccounts: BankAccount[] = [
  {
    id: 'bank1', userId: 'user1', bankName: 'State Bank of India', accountHolderName: 'Ravi Traders',
    accountNumber: '123456789012', ifscCode: 'SBIN0001234', branchName: 'Lajpat Nagar',
    accountType: 'Current', upiId: 'ravitraders@sbi', isDefault: true, displayLabel: 'SBI Main',
  },
  {
    id: 'bank2', userId: 'user1', bankName: 'HDFC Bank', accountHolderName: 'Ravi Kumar',
    accountNumber: '987654321098', ifscCode: 'HDFC0005678', branchName: 'Karol Bagh',
    accountType: 'Savings', isDefault: false, displayLabel: 'HDFC Personal',
  },
  {
    id: 'bank3', userId: 'user2', bankName: 'HDFC Bank', accountHolderName: 'Amit Electronics',
    accountNumber: '567890123456', ifscCode: 'HDFC0001234', branchName: 'MG Road',
    accountType: 'Current', upiId: 'amitelec@hdfc', isDefault: true, displayLabel: 'HDFC GST',
  },
];

import { useState, lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/context/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import AppSidebar from '@/components/AppSidebar';
import Login from '@/pages/Login';

// Lazy-loaded page components
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const UserManagement = lazy(() => import('@/pages/admin/UserManagement'));
const AdminUserInvoices = lazy(() => import('@/pages/admin/AdminUserInvoices'));
const UserDashboard = lazy(() => import('@/pages/user/UserDashboard'));
const ChatbotInvoice = lazy(() => import('@/pages/user/ChatbotInvoice'));
const InvoicesPage = lazy(() => import('@/pages/user/Invoices'));
const CustomersPage = lazy(() => import('@/pages/user/Customers'));
const ProductsPage = lazy(() => import('@/pages/user/Products'));
const ReportsPage = lazy(() => import('@/pages/user/Reports'));
const EmployeesPage = lazy(() => import('@/pages/user/Employees'));
const SettingsPage = lazy(() => import('@/pages/user/Settings'));
const PurchasesPage = lazy(() => import('@/pages/user/Purchases'));
const SuppliersPage = lazy(() => import('@/pages/user/Suppliers'));
const CreditNotesPage = lazy(() => import('@/pages/user/CreditNotes'));
const DebitNotesPage = lazy(() => import('@/pages/user/DebitNotes'));
const PaymentsPage = lazy(() => import('@/pages/user/Payments'));
const StockLedgerPage = lazy(() => import('@/pages/user/StockLedger'));
const DailyLedgerPage = lazy(() => import('@/pages/user/DailyLedger'));
const CreateInvoicePage = lazy(() => import('@/pages/user/CreateInvoice'));
const ExpensesPage = lazy(() => import('@/pages/user/Expenses'));
const DeliveryChallansPage = lazy(() => import('@/pages/user/DeliveryChallans'));
const SalesReturnsPage = lazy(() => import('@/pages/user/SalesReturns'));
const PurchaseReturnsPage = lazy(() => import('@/pages/user/PurchaseReturns'));
const BankLedgerPage = lazy(() => import('@/pages/user/BankLedger'));
const SalaryManagementPage = lazy(() => import('@/pages/user/SalaryManagement'));
const PartnersPage = lazy(() => import('@/pages/user/Partners'));
const StaffActivityPage = lazy(() => import('@/pages/user/StaffActivity'));
const LowStockAlertsPage = lazy(() => import('@/pages/user/LowStockAlerts'));
const PaymentReceiptPage = lazy(() => import('@/pages/user/PaymentReceipt'));
const QuotationsPage = lazy(() => import('@/pages/user/Quotations'));

const PageFallback = () => (
  <div className="flex items-center justify-center py-20">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

export default function MainApp() {
  const { session, loading: authLoading, role } = useAuth();
  const { loading: dataLoading } = useApp();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  if (authLoading || (session && dataLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-primary mb-4 animate-pulse">
            <span className="text-2xl font-display font-bold text-primary-foreground">B</span>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Login />;

  const renderContent = () => {
    let content: JSX.Element;

    if (role === 'super_admin') {
      switch (activeTab) {
        case 'dashboard': content = <AdminDashboard />; break;
        case 'users': content = <UserManagement />; break;
        case 'user-invoices': content = <AdminUserInvoices />; break;
        default: content = <AdminDashboard />; break;
      }
    } else if (role === 'employee') {
      switch (activeTab) {
        case 'chatbot': content = <ChatbotInvoice />; break;
        case 'customers': content = <CustomersPage />; break;
        case 'products': content = <ProductsPage />; break;
        case 'purchases': content = <PurchasesPage />; break;
        case 'payments': content = <PaymentsPage />; break;
        case 'reports': content = <ReportsPage />; break;
        default: content = <ChatbotInvoice />; break;
      }
    } else {
      switch (activeTab) {
        case 'dashboard': content = <UserDashboard onNavigate={setActiveTab} />; break;
        case 'chatbot': content = <ChatbotInvoice />; break;
        case 'invoices': content = <InvoicesPage onNavigate={setActiveTab} />; break;
        case 'quotations': content = <QuotationsPage onNavigate={setActiveTab} />; break;
        case 'create-invoice': content = <CreateInvoicePage onBack={() => setActiveTab('invoices')} />; break;
        case 'payments': content = <PaymentsPage />; break;
        case 'customers': content = <CustomersPage />; break;
        case 'products': content = <ProductsPage />; break;
        case 'stock-ledger': content = <StockLedgerPage />; break;
        case 'low-stock': content = <LowStockAlertsPage />; break;
        case 'purchases': content = <PurchasesPage />; break;
        case 'suppliers': content = <SuppliersPage />; break;
        case 'daily-ledger': content = <DailyLedgerPage />; break;
        case 'expenses': content = <ExpensesPage />; break;
        case 'bank-ledger': content = <BankLedgerPage />; break;
        case 'delivery-challan': content = <DeliveryChallansPage />; break;
        case 'sales-return': content = <SalesReturnsPage />; break;
        case 'purchase-return': content = <PurchaseReturnsPage />; break;
        case 'credit-notes': content = <CreditNotesPage />; break;
        case 'debit-notes': content = <DebitNotesPage />; break;
        case 'payment-receipt': content = <PaymentReceiptPage />; break;
        case 'reports': content = <ReportsPage />; break;
        case 'employees': content = <EmployeesPage />; break;
        case 'salary': content = <SalaryManagementPage />; break;
        case 'partners': content = <PartnersPage />; break;
        case 'staff-activity': content = <StaffActivityPage />; break;
        case 'settings': content = <SettingsPage />; break;
        default: content = <UserDashboard />; break;
      }
    }

    return <Suspense fallback={<PageFallback />}>{content}</Suspense>;
  };

  const sidebarRole = role === 'super_admin' ? 'admin' : role === 'owner' ? 'user' : 'employee';

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <AppSidebar activeTab={activeTab} setActiveTab={setActiveTab} collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className="pt-12 pb-16 px-3">{renderContent()}</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar activeTab={activeTab} setActiveTab={setActiveTab} collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className="flex-1 overflow-y-auto p-6">{renderContent()}</main>
    </div>
  );
}

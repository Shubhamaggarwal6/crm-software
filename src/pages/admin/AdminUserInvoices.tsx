import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import InvoicesPage from '@/pages/user/Invoices';
import CustomersPage from '@/pages/user/Customers';
import ProductsPage from '@/pages/user/Products';

export default function AdminUserInvoices() {
  const { users, employees } = useApp();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [tab, setTab] = useState('invoices');

  if (!selectedUserId) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-display font-bold">User Invoices</h1>
        <div className="space-y-3">
          {users.map(u => (
            <button key={u.id} onClick={() => setSelectedUserId(u.id)} className="w-full hero-card text-left hover:border-primary/30 transition-colors">
              <div className="font-medium">{u.firmName}</div>
              <div className="text-xs text-muted-foreground">{u.username} · {u.plan} · GST: {u.gstNumber}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const user = users.find(u => u.id === selectedUserId);
  return (
    <div className="space-y-4 animate-fade-in">
      <button onClick={() => setSelectedUserId(null)} className="text-sm text-primary hover:underline">← Sab Users</button>
      <div className="rounded-md bg-accent p-2 text-sm">👁️ {user?.firmName} — Admin View (Read Only)</div>
      <div className="flex gap-2 border-b pb-2">
        {['invoices', 'customers', 'products'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
            {t === 'invoices' ? 'Invoices' : t === 'customers' ? 'Customers' : 'Products'}
          </button>
        ))}
      </div>
      {/* Temporarily override session.userId for viewing */}
      {tab === 'invoices' && <InvoicesPage viewOnly />}
      {tab === 'customers' && <CustomersPage viewOnly />}
      {tab === 'products' && <ProductsPage viewOnly />}
    </div>
  );
}

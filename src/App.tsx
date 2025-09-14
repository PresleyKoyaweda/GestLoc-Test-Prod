import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import OwnerDashboard from './components/Dashboard/OwnerDashboard';
import PropertiesTab from './components/Properties/PropertiesTab';
import TenantsTab from './components/Tenants/TenantsTab';
import PaymentsTab from './components/Payments/PaymentsTab';
import ExpensesTab from './components/Expenses/ExpensesTab';
import IssuesTab from './components/Issues/IssuesTab';
import ReportsTab from './components/Reports/ReportsTab';
import AIAgentsTab from './components/AI/AIAgentsTab';
import SettingsTab from './components/Settings/SettingsTab';
import SubscriptionTab from './components/Subscription/SubscriptionTab';
import PropertySearch from './components/Search/PropertySearch';
import MyRentalTab from './components/Tenant/MyRentalTab';
import TenantHistoryTab from './components/Tenant/TenantHistoryTab';
import PropertyRequestsTab from './components/Properties/PropertyRequestsTab';
import VisitRequestsTab from './components/Properties/VisitRequestsTab';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return user.role === 'owner' ? <OwnerDashboard onTabChange={setActiveTab} /> : <PropertySearch />;
      case 'properties':
        return <PropertiesTab onTabChange={setActiveTab} />;
      case 'tenants':
        return <TenantsTab onTabChange={setActiveTab} />;
      case 'payments':
        return <PaymentsTab onTabChange={setActiveTab} />;
      case 'expenses':
        return <ExpensesTab onTabChange={setActiveTab} />;
      case 'issues':
        return <IssuesTab onTabChange={setActiveTab} />;
      case 'reports':
        return <ReportsTab onTabChange={setActiveTab} />;
      case 'ai-agents':
        return <AIAgentsTab />;
      case 'settings':
        return <SettingsTab />;
      case 'subscription':
        return <SubscriptionTab />;
      case 'search':
        return <PropertySearch />;
      case 'my-rental':
        return <MyRentalTab onTabChange={setActiveTab} />;
      case 'history':
        return <TenantHistoryTab />;
      case 'property-requests':
        return <PropertyRequestsTab />;
      case 'visit-requests':
        return <VisitRequestsTab />;
      default:
        return user.role === 'owner' ? <OwnerDashboard onTabChange={setActiveTab} /> : <PropertySearch />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        user={user}
      />
      
      <div className="flex">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          userRole={user.role}
        />
        
        <main className="flex-1 lg:ml-64">
          <div className="p-4 lg:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
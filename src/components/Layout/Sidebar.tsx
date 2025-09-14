import React from 'react';
import { 
  Home, 
  Building2, 
  Users, 
  CreditCard, 
  Receipt, 
  AlertTriangle, 
  Bot, 
  Settings,
  Search,
  BarChart3,
  Crown,
  Calendar,
  Menu,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  userRole: 'owner' | 'tenant';
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeTab, onTabChange, userRole }) => {
  const ownerTabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: Home },
    { id: 'properties', label: 'Propriétés', icon: Building2 },
    { id: 'property-requests', label: 'Demandes', icon: Users },
    { id: 'visit-requests', label: 'Visites', icon: Calendar },
    { id: 'tenants', label: 'Locataires', icon: Users },
    { id: 'payments', label: 'Paiements', icon: CreditCard },
    { id: 'expenses', label: 'Dépenses', icon: Receipt },
    { id: 'issues', label: 'Problèmes', icon: AlertTriangle },
    { id: 'reports', label: 'Rapports', icon: BarChart3 },
    { id: 'ai-agents', label: 'Agents IA', icon: Bot },
    { id: 'subscription', label: 'Abonnement', icon: Crown },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  const tenantTabs = [
    { id: 'search', label: 'Recherche', icon: Search },
    { id: 'my-rental', label: 'Mon logement', icon: Home },
    { id: 'history', label: 'Mon historique', icon: Calendar },
    { id: 'payments', label: 'Paiements', icon: CreditCard },
    { id: 'issues', label: 'Mes signalements', icon: AlertTriangle },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  const tabs = userRole === 'owner' ? ownerTabs : tenantTabs;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-6 lg:justify-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GestionLoc Pro</h1>
            <p className="text-sm text-gray-500 mt-1">
              {userRole === 'owner' ? 'Espace Propriétaire' : 'Espace Locataire'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="px-4 pb-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id);
                  onClose(); // Close sidebar on mobile after selection
                }}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg mb-1 transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
import React from 'react';
import { Building2, Users, DollarSign, TrendingUp, AlertTriangle, Calendar, Clock, CheckCircle, XCircle, CreditCard } from 'lucide-react';
import { useProperties } from '../../hooks/useProperties';
import { useTenants } from '../../hooks/useTenants';
import { usePayments } from '../../hooks/usePayments';
import { useExpenses } from '../../hooks/useExpenses';
import { useIssues } from '../../hooks/useIssues';
import { useUnits } from '../../hooks/useUnits';
import { usePropertyRequests } from '../../hooks/usePropertyRequests';
import { useTranslation } from '../../hooks/useTranslation';

interface OwnerDashboardProps {
  onTabChange: (tab: string) => void;
}

const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ onTabChange }) => {
  const { t, formatCurrency } = useTranslation();
  const { properties, loading: propertiesLoading } = useProperties();
  const { tenants, loading: tenantsLoading } = useTenants();
  const { payments, loading: paymentsLoading } = usePayments();
  const { expenses, loading: expensesLoading } = useExpenses();
  const { issues, loading: issuesLoading } = useIssues();
  const { units, loading: unitsLoading } = useUnits();
  const { requests, loading: requestsLoading } = usePropertyRequests();

  const loading = propertiesLoading || tenantsLoading || paymentsLoading || expensesLoading || issuesLoading || unitsLoading || requestsLoading;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Calculs pour le mois en cours
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Paiements du mois en cours
  const currentMonthPayments = payments.filter(p => {
    const paymentDate = new Date(p.due_date);
    return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
  });
  
  // Revenus potentiels du mois (tous les loyers dus)
  const potentialMonthlyRevenue = currentMonthPayments.reduce((sum, p) => sum + p.amount, 0);
  
  // Revenus réellement perçus ce mois
  const actualMonthlyRevenue = currentMonthPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  
  // Taux de complétude des paiements
  const paymentCompletionRate = currentMonthPayments.length > 0 
    ? (currentMonthPayments.filter(p => p.status === 'paid').length / currentMonthPayments.length) * 100 
    : 0;
  
  // Revenus en attente
  const pendingRevenue = currentMonthPayments
    .filter(p => p.status === 'pending' || p.status === 'late' || p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0);

  const stats = {
    totalProperties: properties.length,
    actualRevenue: actualMonthlyRevenue,
    potentialRevenue: potentialMonthlyRevenue,
    paymentCompletionRate,
    pendingIssues: issues.filter(issue => issue.status === 'pending').length,
  };

  // Calculate total units across all properties
  const totalUnits = properties.reduce((sum, property) => {
    if (property.type === 'entire') {
      return sum + 1;
    } else {
      const propertyUnits = units.filter(unit => unit.property_id === property.id);
      return sum + propertyUnits.length;
    }
  }, 0);

  // Calculate occupied units based on tenants
  const occupiedUnits = properties.reduce((sum, property) => {
    if (property.type === 'entire') {
      const propertyTenants = tenants.filter(tenant => tenant.property_id === property.id);
      return sum + (propertyTenants.length > 0 ? 1 : 0);
    } else {
      const propertyTenants = tenants.filter(tenant => tenant.property_id === property.id);
      return sum + propertyTenants.length;
    }
  }, 0);

  const availableUnits = totalUnits - occupiedUnits;
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

  const recentPayments = payments
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const urgentIssues = issues.filter(issue => issue.priority === 'urgent' && issue.status !== 'resolved');
  const latePayments = payments.filter(p => p.status === 'late' || p.status === 'overdue');
  const pendingRequests = requests.filter(r => r.status === 'en_attente');
  
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const openIssues = issues.filter(i => i.status !== 'resolved');
  const overduePayments = payments.filter(p => p.status === 'overdue');
  const leaseExpiringSoon = tenants.filter(t => {
    const endDate = new Date(t.lease_end);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 60 && diffDays > 0;
  });

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de bord</h1>
        <p className="text-gray-600">Vue d'ensemble de votre portefeuille immobilier</p>
      </div>

      {/* Urgent Alerts */}
      {(urgentIssues.length > 0 || latePayments.length > 0 || pendingRequests.length > 0) && (
        <div className="mb-8 space-y-4">
          {pendingRequests.length > 0 && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-blue-400 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">
                      {pendingRequests.length} nouvelle{pendingRequests.length > 1 ? 's' : ''} demande{pendingRequests.length > 1 ? 's' : ''} de logement
                    </h3>
                    <p className="text-sm text-blue-700">Des candidats souhaitent rejoindre vos propriétés</p>
                  </div>
                </div>
                <button
                  onClick={() => onTabChange('property-requests')}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  Voir les demandes →
                </button>
              </div>
            </div>
          )}
          
          {urgentIssues.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">
                      {urgentIssues.length} problème{urgentIssues.length > 1 ? 's' : ''} urgent{urgentIssues.length > 1 ? 's' : ''}
                    </h3>
                    <p className="text-sm text-red-700">Nécessite une attention immédiate</p>
                  </div>
                </div>
                <button
                  onClick={() => onTabChange('issues')}
                  className="text-red-600 hover:text-red-800 font-medium text-sm"
                >
                  Voir les problèmes →
                </button>
              </div>
            </div>
          )}
          
          {latePayments.length > 0 && (
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <DollarSign className="w-5 h-5 text-orange-400 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-orange-800">
                      {latePayments.length} paiement{latePayments.length > 1 ? 's' : ''} en retard
                    </h3>
                    <p className="text-sm text-orange-700">Relances nécessaires</p>
                  </div>
                </div>
                <button
                  onClick={() => onTabChange('payments')}
                  className="text-orange-600 hover:text-orange-800 font-medium text-sm"
                >
                  Voir les paiements →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onTabChange('properties')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Propriétés</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProperties}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onTabChange('tenants')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unités occupées</p>
              <p className="text-2xl font-bold text-gray-900">{occupiedUnits}/{totalUnits}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onTabChange('payments')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenus perçus ce mois</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.actualRevenue)}</p>
              <p className="text-xs text-gray-500">sur {formatCurrency(stats.potentialRevenue)} attendus</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onTabChange('reports')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taux de paiement</p>
              <p className="text-2xl font-bold text-blue-600">{stats.paymentCompletionRate.toFixed(1)}%</p>
              <p className="text-xs text-gray-500">{currentMonthPayments.filter(p => p.status === 'paid').length}/{currentMonthPayments.length} paiements</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Indicateurs supplémentaires */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onTabChange('payments')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Paiements en attente</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingPayments.length}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onTabChange('payments')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Paiements en retard</p>
              <p className="text-2xl font-bold text-red-600">{overduePayments.length}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onTabChange('issues')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Problèmes ouverts</p>
              <p className="text-2xl font-bold text-orange-600">{openIssues.length}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onTabChange('tenants')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Baux expirant</p>
              <p className="text-2xl font-bold text-purple-600">{leaseExpiringSoon.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AI Assistant Summary */}
        <div 
          className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onTabChange('ai-agents')}
        >
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Assistant IA - Analyse financière</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Bénéfice net total</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(actualMonthlyRevenue - (expenses.reduce((sum, e) => sum + e.amount, 0)))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Taux de paiement</span>
              <span className="font-semibold text-blue-600">
                {stats.paymentCompletionRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Revenus en attente</span>
              <span className="font-semibold text-purple-600">
                {formatCurrency(pendingRevenue)}
              </span>
            </div>
          </div>
          <button className="w-full mt-4 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            Voir analyses détaillées
          </button>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activité récente</h3>
          <div className="space-y-4">
            {recentPayments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucune activité récente</p>
            ) : (
              recentPayments.map((payment) => (
                <div 
                  key={payment.id} 
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  onClick={() => onTabChange('payments')}
                >
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      payment.status === 'paid' ? 'bg-green-500' :
                      payment.status === 'late' ? 'bg-orange-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">Paiement {formatCurrency(payment.amount)}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(payment.due_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                    payment.status === 'late' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {payment.status === 'paid' ? 'Payé' :
                     payment.status === 'late' ? 'En retard' : 'En attente'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => onTabChange('properties')}
            className="bg-blue-600 text-white p-4 rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Building2 className="w-6 h-6 mb-2" />
            <span className="font-medium">Ajouter une propriété</span>
          </button>
          <button 
            onClick={() => onTabChange('tenants')}
            className="bg-green-600 text-white p-4 rounded-xl hover:bg-green-700 transition-colors"
          >
            <Users className="w-6 h-6 mb-2" />
            <span className="font-medium">Nouveau locataire</span>
          </button>
          <button 
            onClick={() => onTabChange('expenses')}
            className="bg-purple-600 text-white p-4 rounded-xl hover:bg-purple-700 transition-colors"
          >
            <Calendar className="w-6 h-6 mb-2" />
            <span className="font-medium">Ajouter une dépense</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
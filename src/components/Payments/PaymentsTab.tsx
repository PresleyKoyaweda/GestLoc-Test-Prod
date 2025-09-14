import React, { useState, useEffect } from 'react';
import { Plus, CreditCard, Check, X, Clock, AlertTriangle, Filter, Download } from 'lucide-react';
import { usePayments } from '../../hooks/usePayments';
import { useTenants } from '../../hooks/useTenants';
import { useProperties } from '../../hooks/useProperties';
import { useUnits } from '../../hooks/useUnits';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';

interface PaymentsTabProps {
  onTabChange: (tab: string) => void;
}

const PaymentsTab: React.FC<PaymentsTabProps> = ({ onTabChange }) => {
  const { user } = useAuth();
  const { formatCurrency } = useTranslation();
  const { payments, loading, markAsPaid, markAsLate, generateMonthlyPayments } = usePayments();
  const { tenants } = useTenants();
  const { properties } = useProperties();
  const { units } = useUnits();
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'late' | 'overdue'>('all');

  // Generate monthly payments on component mount
  useEffect(() => {
    if (user?.role === 'owner' && tenants.length > 0) {
      generateMonthlyPayments();
    }
  }, [user, tenants.length]);

  const getTenantInfo = (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return { name: 'Locataire supprimé', property: '' };
    
    const property = properties.find(p => p.id === tenant.property_id);
    const unit = units.find(u => u.id === tenant.unit_id);
    
    return {
      name: `Locataire #${tenant.id.slice(-4)}`,
      property: property ? `${property.name}${unit ? ` - ${unit.name}` : ''}` : 'Propriété supprimée'
    };
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      await markAsPaid(paymentId);
      alert('✅ Paiement marqué comme payé !');
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      alert('Erreur lors de la mise à jour du paiement');
    }
  };

  const handleMarkAsLate = async (paymentId: string) => {
    try {
      await markAsLate(paymentId);
      alert('⚠️ Paiement marqué en retard');
    } catch (error) {
      console.error('Error marking payment as late:', error);
      alert('Erreur lors de la mise à jour du paiement');
    }
  };

  const userPayments = (() => {
    if (user?.role === 'owner') {
      return payments;
    } else {
      const currentTenant = tenants.find(t => t.user_id === user?.id);
      return currentTenant ? payments.filter(payment => payment.tenant_id === currentTenant.id) : [];
    }
  })();

  const filteredPayments = userPayments.filter(payment => 
    filter === 'all' || payment.status === filter
  );

  const stats = {
    total: userPayments.length,
    paid: userPayments.filter(p => p.status === 'paid').length,
    pending: userPayments.filter(p => p.status === 'pending').length,
    late: userPayments.filter(p => p.status === 'late').length,
    overdue: userPayments.filter(p => p.status === 'overdue').length,
    totalAmount: userPayments.reduce((sum, p) => sum + p.amount, 0),
    paidAmount: userPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'late':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'overdue':
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payé';
      case 'pending':
        return 'En attente';
      case 'late':
        return 'En retard';
      case 'overdue':
        return 'Impayé';
      default:
        return 'Inconnu';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'late':
        return 'bg-orange-100 text-orange-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
          <p className="text-gray-600">Suivez les paiements de vos locataires</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <Download className="w-5 h-5 mr-2" />
            Exporter
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total paiements</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Montant total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Payés</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.paidAmount)}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En retard</p>
              <p className="text-2xl font-bold text-gray-900">{stats.late + stats.overdue}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex space-x-2">
            {(['all', 'pending', 'paid', 'late', 'overdue'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'Tous' : getStatusText(status)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Locataire
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Propriété
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Échéance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun paiement</h3>
                    <p className="text-gray-500">Les paiements apparaîtront ici automatiquement</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  const tenantInfo = getTenantInfo(payment.tenant_id);
                  
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {tenantInfo.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{tenantInfo.property}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(payment.due_date).toLocaleDateString('fr-FR')}
                        </div>
                        {payment.paid_date && (
                          <div className="text-xs text-gray-500">
                            Payé le {new Date(payment.paid_date).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                          {getStatusIcon(payment.status)}
                          <span className="ml-1">{getStatusText(payment.status)}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {user?.role === 'owner' && payment.status !== 'paid' && (
                            <button
                              onClick={() => handleMarkAsPaid(payment.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Marquer comme payé"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          {user?.role === 'owner' && payment.status === 'pending' && (
                            <button
                              onClick={() => handleMarkAsLate(payment.id)}
                              className="text-orange-600 hover:text-orange-900"
                              title="Marquer en retard"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}
                          {user?.role === 'tenant' && payment.status !== 'paid' && (
                            <button
                              onClick={() => {
                                if (confirm('Confirmer le paiement de ' + formatCurrency(payment.amount) + ' ?')) {
                                  handleMarkAsPaid(payment.id);
                                  alert('✅ Paiement effectué avec succès !');
                                }
                              }}
                              className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                            >
                              Payer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentsTab;
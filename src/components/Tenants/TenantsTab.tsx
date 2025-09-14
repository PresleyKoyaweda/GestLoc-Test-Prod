import React, { useState } from 'react';
import { Plus, Users, Edit, Trash2, Phone, Mail, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { useTenants } from '../../hooks/useTenants';
import { useProperties } from '../../hooks/useProperties';
import { useUnits } from '../../hooks/useUnits';
import { usePayments } from '../../hooks/usePayments';
import { useIssues } from '../../hooks/useIssues';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import TenantForm from './TenantForm';

interface TenantsTabProps {
  onTabChange: (tab: string) => void;
}

const TenantsTab: React.FC<TenantsTabProps> = ({ onTabChange }) => {
  const { user } = useAuth();
  const { tenants, loading, deleteTenant } = useTenants();
  const { properties } = useProperties();
  const { units } = useUnits();
  const { payments } = usePayments();
  const { issues } = useIssues();
  const { canAddTenant, currentPlan } = useSubscription();
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(undefined);

  const handleEdit = (tenant: any) => {
    setEditingTenant(tenant);
    setShowForm(true);
  };

  const handleDelete = async (tenantId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce locataire ?')) {
      try {
        await deleteTenant(tenantId);
      } catch (error) {
        console.error('Error deleting tenant:', error);
        alert('Erreur lors de la suppression du locataire');
      }
    }
  };

  const getPropertyName = (propertyId?: string) => {
    if (!propertyId) return 'Non assigné';
    const property = properties.find(p => p.id === propertyId);
    return property ? property.name : 'Propriété supprimée';
  };

  const getUnitName = (unitId?: string) => {
    if (!unitId) return '';
    const unit = units.find(u => u.id === unitId);
    return unit ? ` - ${unit.name}` : '';
  };

  const getTenantPaymentStatus = (tenantId: string) => {
    const tenantPayments = payments.filter(p => p.tenant_id === tenantId);
    const latePayments = tenantPayments.filter(p => p.status === 'late' || p.status === 'overdue');
    return latePayments.length;
  };

  const getTenantIssues = (tenantId: string) => {
    return issues.filter(i => i.tenant_id === tenantId && i.status !== 'resolved').length;
  };

  const isLeaseExpiringSoon = (leaseEnd: string) => {
    const today = new Date();
    const endDate = new Date(leaseEnd);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const isLeaseExpired = (leaseEnd: string) => {
    const today = new Date();
    const endDate = new Date(leaseEnd);
    return endDate < today;
  };

  const handleAddTenant = () => {
    if (!canAddTenant(tenants.length)) {
      alert(`Vous avez atteint la limite de ${currentPlan.features.maxTenants} locataire${currentPlan.features.maxTenants > 1 ? 's' : ''} pour votre plan ${currentPlan.name}. Veuillez mettre à niveau votre abonnement.`);
      return;
    }
    setEditingTenant(undefined);
    setShowForm(true);
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
          <h1 className="text-2xl font-bold text-gray-900">Locataires</h1>
          <p className="text-gray-600">Gérez vos locataires et leurs baux</p>
        </div>
        <button
          onClick={handleAddTenant}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Ajouter un locataire
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onTabChange && onTabChange('dashboard')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total locataires</p>
              <p className="text-2xl font-bold text-gray-900">{tenants.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onTabChange && onTabChange('payments')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenus mensuels</p>
              <p className="text-2xl font-bold text-gray-900">
                {tenants.reduce((sum, tenant) => sum + tenant.monthly_rent, 0).toLocaleString('fr-CA')}$
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Baux expirant</p>
              <p className="text-2xl font-bold text-gray-900">
                {tenants.filter(t => isLeaseExpiringSoon(t.lease_end)).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Baux expirés</p>
              <p className="text-2xl font-bold text-gray-900">
                {tenants.filter(t => isLeaseExpired(t.lease_end)).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {tenants.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun locataire</h3>
          <p className="text-gray-500 mb-4">Commencez par ajouter votre premier locataire</p>
          <button
            onClick={handleAddTenant}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Ajouter un locataire
          </button>
        </div>
      ) : (
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
                    Bail
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loyer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alertes
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
                {tenants.map((tenant) => {
                  const latePayments = getTenantPaymentStatus(tenant.id);
                  const activeIssues = getTenantIssues(tenant.id);
                  
                  return (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              Locataire #{tenant.id.slice(-4)}
                            </div>
                            <div className="text-sm text-gray-500">
                              Échéance le {tenant.payment_due_date}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <button
                            onClick={() => onTabChange && onTabChange('properties')}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            {getPropertyName(tenant.property_id)}{getUnitName(tenant.unit_id)}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(tenant.lease_start).toLocaleDateString('fr-FR')} - {new Date(tenant.lease_end).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          <button
                            onClick={() => onTabChange && onTabChange('payments')}
                            className="text-sm font-medium text-green-600 hover:text-green-800"
                          >
                            {tenant.monthly_rent.toLocaleString('fr-CA')}$
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          {latePayments > 0 && (
                            <button
                              onClick={() => onTabChange && onTabChange('payments')}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200"
                            >
                              {latePayments} paiement{latePayments > 1 ? 's' : ''} en retard
                            </button>
                          )}
                          {activeIssues > 0 && (
                            <button
                              onClick={() => onTabChange && onTabChange('issues')}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 hover:bg-orange-200"
                            >
                              {activeIssues} problème{activeIssues > 1 ? 's' : ''}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          isLeaseExpired(tenant.lease_end)
                            ? 'bg-red-100 text-red-800'
                            : isLeaseExpiringSoon(tenant.lease_end)
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                        }`}>
                          {isLeaseExpired(tenant.lease_end)
                            ? 'Expiré'
                            : isLeaseExpiringSoon(tenant.lease_end)
                              ? 'Expire bientôt'
                              : 'Actif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(tenant)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tenant.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <TenantForm
          tenant={editingTenant}
          onClose={() => {
            setShowForm(false);
            setEditingTenant(undefined);
          }}
        />
      )}
    </div>
  );
};

export default TenantsTab;
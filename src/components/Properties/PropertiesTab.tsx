import React, { useState } from 'react';
import { Plus, Building2, Users, DollarSign, Edit, Trash2, Wrench } from 'lucide-react';
import { useProperties } from '../../hooks/useProperties';
import { useTenants } from '../../hooks/useTenants';
import { useUnits } from '../../hooks/useUnits';
import { usePropertyEquipment } from '../../hooks/usePropertyEquipment';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { useTranslation } from '../../hooks/useTranslation';
import PropertyForm from './PropertyForm';

interface PropertiesTabProps {
  onTabChange: (tab: string) => void;
}

const PropertiesTab: React.FC<PropertiesTabProps> = ({ onTabChange }) => {
  const { t, formatCurrency } = useTranslation();
  const { user } = useAuth();
  const { properties, loading, deleteProperty } = useProperties();
  const { units } = useUnits();
  const { tenants } = useTenants();
  const { equipment } = usePropertyEquipment();
  const { canAddProperty, currentPlan } = useSubscription();
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(undefined);

  const handleEdit = (property: any) => {
    setEditingProperty(property);
    setShowForm(true);
  };

  const handleDelete = async (propertyId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette propriété ?')) {
      try {
        await deleteProperty(propertyId);
      } catch (error) {
        console.error('Error deleting property:', error);
        alert('Erreur lors de la suppression de la propriété');
      }
    }
  };

  const getPropertyUnits = (propertyId: string) => {
    return units.filter(unit => unit.property_id === propertyId);
  };

  const getPropertyTenants = (propertyId: string) => {
    return tenants.filter(tenant => tenant.property_id === propertyId);
  };

  const getOccupancyStats = (property: any) => {
    if (property.type === 'entire') {
      const propertyTenants = getPropertyTenants(property.id);
      return {
        total: 1,
        occupied: propertyTenants.length > 0 ? 1 : 0,
        available: propertyTenants.length > 0 ? 0 : 1,
        pending: 0
      };
    } else {
      const propertyUnits = getPropertyUnits(property.id);
      const propertyTenants = getPropertyTenants(property.id);
      
      const occupied = propertyTenants.length;
      const available = propertyUnits.length - occupied;
      const pending = 0;
      
      return {
        total: propertyUnits.length,
        occupied,
        available,
        pending
      };
    }
  };

  const handleAddProperty = () => {
    if (!canAddProperty(properties.length)) {
      alert(`Vous avez atteint la limite de ${currentPlan.features.maxProperties} propriété${currentPlan.features.maxProperties > 1 ? 's' : ''} pour votre plan ${currentPlan.name}. Veuillez mettre à niveau votre abonnement.`);
      return;
    }
    setEditingProperty(undefined);
    setShowForm(true);
  };

  const getPropertyEquipmentCount = (propertyId: string) => {
    return equipment.filter(eq => eq.property_id === propertyId).length;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Propriétés</h1>
          <p className="text-gray-600">Gérez votre portefeuille immobilier</p>
        </div>
        <button
          onClick={handleAddProperty}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Ajouter une propriété
        </button>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune propriété</h3>
          <p className="text-gray-500 mb-4">Commencez par ajouter votre première propriété</p>
          <button
            onClick={handleAddProperty}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Ajouter une propriété
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {properties.map((property) => {
            const propertyUnits = getPropertyUnits(property.id);
            const propertyTenants = getPropertyTenants(property.id);
            const occupancyStats = getOccupancyStats(property);
            const occupancyRate = occupancyStats.total > 0 ? (occupancyStats.occupied / occupancyStats.total) * 100 : 0;
            const totalRent = property.type === 'entire' 
              ? property.rent || 0
              : propertyUnits.reduce((sum, unit) => sum + unit.rent, 0);

            return (
              <div key={property.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                  <Building2 className="w-16 h-16 text-blue-500" />
                </div>
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{property.name}</h3>
                      <p className="text-sm text-gray-500">
                        {property.address?.street}
                        {property.address?.apartment && `, ${property.address.apartment}`}
                        <br />
                        {property.address?.city}, {property.address?.province} {property.address?.postal_code}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(property)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(property.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Type</span>
                      <span className="text-sm font-medium">
                        {property.type === 'entire' ? '🏠 Logement entier' : '🛏️ Colocation'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {property.type === 'entire' ? 'Statut' : 'Chambres'}
                      </span>
                      <span className="text-sm font-medium">
                        {property.type === 'entire' ? 
                          (occupancyStats.occupied > 0 ? 'Occupé' : 'Libre') : 
                          `${occupancyStats.total} chambre${occupancyStats.total > 1 ? 's' : ''}`
                        }
                      </span>
                    </div>

                    {property.type === 'shared' && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Occupées</span>
                        <span className="text-sm font-medium text-red-600">{occupancyStats.occupied}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {property.type === 'entire' ? 'Disponible' : 'Libres'}
                      </span>
                      <span className="text-sm font-medium text-green-600">
                        {property.type === 'entire' ? 
                          (occupancyStats.available > 0 ? 'Oui' : 'Non') : 
                          occupancyStats.available
                        }
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Superficie</span>
                      <span className="text-sm font-medium">{property.total_area} m²</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Loyer total</span>
                      <span className="text-sm font-medium text-green-600">{formatCurrency(totalRent)}/mois</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Locataires</span>
                      <button
                        onClick={() => onTabChange && onTabChange('tenants')}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {propertyTenants.length} locataire{propertyTenants.length !== 1 ? 's' : ''}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Occupation</span>
                      <div className="flex items-center">
                        <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${
                              occupancyRate === 100 ? 'bg-red-500' : 
                              occupancyRate >= 75 ? 'bg-orange-500' : 
                              occupancyRate >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${occupancyRate}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold ${
                          occupancyRate === 100 ? 'text-red-600' : 
                          occupancyRate >= 75 ? 'text-orange-600' : 
                          occupancyRate >= 50 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {occupancyRate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        property.status === 'libre' ? 'bg-green-100 text-green-800' :
                        property.status === 'en_attente_validation' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {property.status === 'libre' ? 'Libre' :
                         property.status === 'en_attente_validation' ? 'En attente' : 'Occupé'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Équipements</span>
                  <span className="text-sm font-medium text-purple-600">
                    {getPropertyEquipmentCount(property.id)} équipement{getPropertyEquipmentCount(property.id) !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => handleEdit(property)}
                    className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center"
                    title="Gérer les équipements"
                  >
                    <Wrench className="w-4 h-4 mr-1" />
                    Équipements
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <PropertyForm
          property={editingProperty}
          onClose={() => {
            setShowForm(false);
            setEditingProperty(undefined);
          }}
        />
      )}
    </div>
  );
};

export default PropertiesTab;
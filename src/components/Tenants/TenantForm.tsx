import React, { useState } from 'react';
import { X, User, Mail, Phone, Calendar, DollarSign, AlertTriangle } from 'lucide-react';
import { useTenants } from '../../hooks/useTenants';
import { useProperties } from '../../hooks/useProperties';
import { useUnits } from '../../hooks/useUnits';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { supabase } from '../../lib/supabase';

interface TenantFormProps {
  onClose: () => void;
  tenant?: any;
}

const TenantForm: React.FC<TenantFormProps> = ({ onClose, tenant }) => {
  const { user } = useAuth();
  const { addTenant, updateTenant } = useTenants();
  const { properties } = useProperties();
  const { units } = useUnits();
  const { canAddTenant } = useSubscription();
  
  const [formData, setFormData] = useState({
    user_id: tenant?.user_id || '',
    property_id: tenant?.property_id || '',
    unit_id: tenant?.unit_id || '',
    lease_start: tenant?.lease_start ? new Date(tenant.lease_start).toISOString().split('T')[0] : '',
    lease_end: tenant?.lease_end ? new Date(tenant.lease_end).toISOString().split('T')[0] : '',
    monthly_rent: tenant?.monthly_rent || 0,
    payment_due_date: tenant?.payment_due_date || 1,
    emergency_contact: {
      name: tenant?.emergency_contact?.name || '',
      phone: tenant?.emergency_contact?.phone || '',
      relationship: tenant?.emergency_contact?.relationship || '',
    }
  });

  const [loading, setLoading] = useState(false);

  const selectedProperty = properties.find(p => p.id === formData.property_id);
  const availableUnits = units.filter(u => u.property_id === formData.property_id && u.status === 'libre');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Validation
      if (!formData.property_id) {
        alert('Veuillez sélectionner une propriété.');
        setLoading(false);
        return;
      }
      
      if (selectedProperty?.type === 'shared' && !formData.unit_id) {
        alert('Veuillez sélectionner une chambre pour cette colocation.');
        setLoading(false);
        return;
      }
      
      // Calculer le loyer automatiquement
      let monthlyRent = formData.monthly_rent;
      if (selectedProperty?.type === 'entire') {
        monthlyRent = selectedProperty.rent || 0;
      } else if (formData.unit_id) {
        const selectedUnit = availableUnits.find(u => u.id === formData.unit_id);
        monthlyRent = selectedUnit?.rent || 0;
      }
      
      if (new Date(formData.lease_end) <= new Date(formData.lease_start)) {
        alert('La date de fin du bail doit être postérieure à la date de début.');
        setLoading(false);
        return;
      }
      
      if (!tenant && !canAddTenant(0)) { // We'll get the actual count from the hook
        throw new Error('Vous avez atteint la limite de locataires pour votre plan. Veuillez mettre à niveau votre abonnement.');
      }
      
      // Créer d'abord un profil utilisateur pour le locataire si nécessaire
      let tenantUserId = formData.user_id;
      
      if (!tenant && !tenantUserId) {
        // Générer un ID temporaire pour le locataire
        tenantUserId = crypto.randomUUID();
        
        // Créer un profil minimal pour le locataire
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: tenantUserId,
            email: `tenant-${tenantUserId.slice(-8)}@temp.local`,
            first_name: 'Locataire',
            last_name: `#${tenantUserId.slice(-4)}`,
            role: 'tenant'
          });
          
        if (profileError) {
          console.error('Error creating tenant profile:', profileError);
          throw new Error('Erreur lors de la création du profil locataire');
        }
      }
      
      const tenantData = {
        user_id: tenantUserId,
        property_id: formData.property_id,
        unit_id: formData.unit_id || null,
        lease_start: formData.lease_start,
        lease_end: formData.lease_end,
        monthly_rent: monthlyRent,
        payment_due_date: formData.payment_due_date,
        emergency_contact: formData.emergency_contact,
        status: 'active'
      };

      if (tenant) {
        await updateTenant(tenant.id, tenantData);
      } else {
        await addTenant(tenantData);
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving tenant:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde du locataire');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {tenant ? 'Modifier le locataire' : 'Ajouter un locataire'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Property Assignment */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Logement</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Propriété *
                </label>
                <select
                  value={formData.property_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, property_id: e.target.value, unit_id: '' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner une propriété</option>
                  {properties.map(property => (
                    <option key={property.id} value={property.id}>
                      {property.name} - {property.address?.street}, {property.address?.city}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedProperty?.type === 'shared' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chambre *
                  </label>
                  <select
                    value={formData.unit_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sélectionner une chambre</option>
                    {availableUnits.map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} - {unit.rent}$/mois
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Lease Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Bail</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Début du bail *
                </label>
                <input
                  type="date"
                  value={formData.lease_start}
                  onChange={(e) => setFormData(prev => ({ ...prev, lease_start: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fin du bail *
                </label>
                <input
                  type="date"
                  value={formData.lease_end}
                  onChange={(e) => setFormData(prev => ({ ...prev, lease_end: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loyer mensuel (CAD) *
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                  <span className="text-gray-700">
                    {selectedProperty?.type === 'entire' 
                      ? `${selectedProperty.rent || 0}$ (automatique)`
                      : formData.unit_id 
                        ? `${availableUnits.find(u => u.id === formData.unit_id)?.rent || 0}$ (automatique)`
                        : 'Sélectionnez une chambre'
                    }
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date d'échéance mensuelle
                </label>
                <select
                  value={formData.payment_due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_due_date: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contact d'urgence</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={formData.emergency_contact.name}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    emergency_contact: { ...prev.emergency_contact, name: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.emergency_contact.phone}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    emergency_contact: { ...prev.emergency_contact, phone: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relation
                </label>
                <select
                  value={formData.emergency_contact.relationship}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    emergency_contact: { ...prev.emergency_contact, relationship: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner</option>
                  <option value="parent">Parent</option>
                  <option value="conjoint">Conjoint(e)</option>
                  <option value="ami">Ami(e)</option>
                  <option value="collegue">Collègue</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Sauvegarde...' : (tenant ? 'Modifier' : 'Ajouter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TenantForm;
import React, { useState } from 'react';
import { X, Upload, AlertTriangle, Home } from 'lucide-react';
import { useIssues } from '../../hooks/useIssues';
import { useProperties } from '../../hooks/useProperties';
import { useUnits } from '../../hooks/useUnits';
import { useTenants } from '../../hooks/useTenants';
import { useAuth } from '../../contexts/AuthContext';

interface IssueFormProps {
  onClose: () => void;
  issue?: any;
  isOwner?: boolean;
}

const IssueForm: React.FC<IssueFormProps> = ({ onClose, issue, isOwner = true }) => {
  const { addIssue, updateIssue } = useIssues();
  const { properties } = useProperties();
  const { units } = useUnits();
  const { tenants } = useTenants();
  const { user } = useAuth();

  // For tenants, find their tenant record to get their property
  const currentTenant = tenants.find(t => t.user_id === user?.id);
  
  const [formData, setFormData] = useState({
    title: issue?.title || '',
    description: issue?.description || '',
    priority: issue?.priority || 'medium',
    property_id: issue?.property_id || currentTenant?.property_id || '',
    unit_id: issue?.unit_id || currentTenant?.unit_id || '',
    owner_notes: issue?.owner_notes || '',
    photos: [] as File[],
  });

  const [loading, setLoading] = useState(false);

  const selectedProperty = properties.find(p => p.id === formData.property_id);
  const availableUnits = units.filter(u => u.property_id === formData.property_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const photoUrls = formData.photos.map(photo => URL.createObjectURL(photo));
      
      // Find tenant ID for the current user if they're a tenant
      const currentTenant = tenants.find(t => t.user_id === user?.id);
      const tenantId = isOwner ? (issue?.tenant_id || currentTenant?.id || '1') : (currentTenant?.id || user?.id || '1');
      
      const issueData = {
        tenant_id: tenantId,
        property_id: formData.property_id || undefined,
        unit_id: formData.unit_id || undefined,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: issue?.status || 'pending',
        photos: [...(issue?.photos || []), ...photoUrls],
        owner_notes: formData.owner_notes,
      };

      if (issue) {
        await updateIssue(issue.id, issueData);
      } else {
        await addIssue(issueData);
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving issue:', error);
      alert('Erreur lors de la sauvegarde du problème');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({ ...prev, photos: [...prev.photos, ...files] }));
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const priorities = [
    { value: 'low', label: 'Faible', color: 'text-green-600' },
    { value: 'medium', label: 'Moyenne', color: 'text-yellow-600' },
    { value: 'high', label: 'Élevée', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgente', color: 'text-red-600' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {issue ? 'Modifier le problème' : 'Signaler un problème'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre du problème *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ex: Fuite d'eau dans la salle de bain"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description détaillée *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Décrivez le problème en détail..."
              required
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Priorité *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {priorities.map((priority) => (
                <label
                  key={priority.value}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                    formData.priority === priority.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={priority.value}
                    checked={formData.priority === priority.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                    className="sr-only"
                  />
                  <AlertTriangle className={`w-5 h-5 mr-2 ${priority.color}`} />
                  <span className="text-sm font-medium">{priority.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Localisation</h3>
            {isOwner ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Propriété
                  </label>
                  <select
                    value={formData.property_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, property_id: e.target.value, unit_id: '' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner une propriété</option>
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>
                        {property.name} - {property.address?.street}, {property.address?.city}
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedProperty?.type === 'shared' && availableUnits.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chambre
                    </label>
                    <select
                      value={formData.unit_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Espaces communs</option>
                      {availableUnits.map(unit => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : currentTenant ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Home className="w-5 h-5 text-blue-600 mr-3" />
                  <div>
                    <h4 className="font-medium text-blue-900">Votre logement</h4>
                    <p className="text-sm text-blue-800">
                      {selectedProperty?.name}
                      {selectedProperty?.type === 'shared' && availableUnits.find(u => u.id === currentTenant.unit_id) && 
                        ` - ${availableUnits.find(u => u.id === currentTenant.unit_id)?.name}`
                      }
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Vous devez être assigné à un logement pour signaler un problème.
                </p>
              </div>
            )}
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photos du problème
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                    <span>Télécharger des photos</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoChange}
                    />
                  </label>
                  <p className="pl-1">ou glisser-déposer</p>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG jusqu'à 10MB chacune
                </p>
              </div>
            </div>
            
            {formData.photos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Owner Notes (only for owners) */}
          {isOwner && issue && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes du propriétaire
              </label>
              <textarea
                value={formData.owner_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, owner_notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Notes internes, actions prises, etc."
              />
            </div>
          )}

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
              {loading ? 'Sauvegarde...' : (issue ? 'Modifier' : 'Signaler')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IssueForm;
import React, { useState } from 'react';
import { X, Upload, User, Mail, Phone, FileText, MessageSquare } from 'lucide-react';
import { usePropertyRequests } from '../../hooks/usePropertyRequests';
import { useVisitRequests } from '../../hooks/useVisitRequests';
import { useProperties } from '../../hooks/useProperties';
import { useUnits } from '../../hooks/useUnits';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface PropertyRequestFormProps {
  property: any;
  unit?: any | null;
  onClose: () => void;
}

const PropertyRequestForm: React.FC<PropertyRequestFormProps> = ({ property, unit, onClose }) => {
  const { user } = useAuth();
  const { addRequest } = usePropertyRequests();
  const { visitRequests } = useVisitRequests();
  const { updateProperty } = useProperties();
  const { updateUnit } = useUnits();
  
  const [formData, setFormData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    message: '',
    idDocument: null as File | null,
    communicationPreference: user?.preferences?.aiCommunication || 'email' as 'email' | 'sms',
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
        throw new Error('Veuillez remplir tous les champs obligatoires.');
      }
      
      // Find the visit request that enabled this property request
      const enabledByVisit = visitRequests.find(vr => 
        vr.tenant_id === user?.id &&
        vr.property_id === property.id &&
        (unit ? vr.unit_id === unit.id : !vr.unit_id) &&
        (vr.status === 'confirmed' || vr.status === 'completed')
      );
      
      const requestData = {
        property_id: property.id,
        unit_id: unit?.id,
        tenant_id: user?.id || '',
        status: 'en_attente',
        request_date: new Date().toISOString(),
        tenant_info: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          idDocument: formData.idDocument ? URL.createObjectURL(formData.idDocument) : undefined,
          communicationPreference: formData.communicationPreference,
        },
      };

      // Add request
      await addRequest(requestData);

      // Update property/unit status
      if (unit) {
        await updateUnit(unit.id, { status: 'en_attente_validation' });
      } else {
        await updateProperty(property.id, { status: 'en_attente_validation' });
      }

      // Créer notification pour le propriétaire
      try {
        await supabase
        .from('notifications')
        .insert({
          user_id: property.owner_id,
          type: 'general',
          title: 'Nouvelle demande de logement',
          message: `${formData.firstName} ${formData.lastName} souhaite ${unit ? `rejoindre la chambre ${unit.name}` : 'louer votre logement'} - ${property.name}`,
          read: false,
          data: {
            property_id: property.id,
            unit_id: unit?.id,
            tenant_id: user?.id
          }
        });
      } catch (notificationError) {
        console.warn('Notification non envoyée:', notificationError);
        // Ne pas faire échouer la demande principale
      }

      alert('✅ Votre demande a été envoyée avec succès au propriétaire ! Vous recevrez une notification de sa réponse.');
      onClose();
    } catch (error) {
      console.error('Error submitting request:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'envoi de la demande');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, idDocument: file }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {unit ? `Demande pour la chambre ${unit.name}` : 'Demande de logement'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Property Info */}
        <div className="p-6 bg-blue-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">{property.name}</h3>
          <p className="text-sm text-gray-600">
            {property.address?.street}, {property.address?.city}
          </p>
          {unit && (
            <div className="mt-2 p-3 bg-white rounded-lg">
              <h4 className="font-medium text-gray-900">{unit.name}</h4>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                <span>{unit.area} m²</span>
                <span className="font-semibold text-green-600">{unit.rent}$/mois</span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Informations personnelles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              Message au propriétaire (optionnel)
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Présentez-vous et expliquez pourquoi vous souhaitez ce logement..."
            />
          </div>

          {/* Communication Preference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Préférence de communication pour les messages IA
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                formData.communicationPreference === 'email'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="communicationPreference"
                  value="email"
                  checked={formData.communicationPreference === 'email'}
                  onChange={(e) => setFormData(prev => ({ ...prev, communicationPreference: e.target.value as 'email' | 'sms' }))}
                  className="sr-only"
                />
                <Mail className="w-5 h-5 mr-2 text-blue-600" />
                <span className="text-sm font-medium">Email</span>
              </label>
              <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                formData.communicationPreference === 'sms'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="communicationPreference"
                  value="sms"
                  checked={formData.communicationPreference === 'sms'}
                  onChange={(e) => setFormData(prev => ({ ...prev, communicationPreference: e.target.value as 'email' | 'sms' }))}
                  className="sr-only"
                />
                <Phone className="w-5 h-5 mr-2 text-green-600" />
                <span className="text-sm font-medium">SMS</span>
              </label>
            </div>
          </div>

          {/* ID Document */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Pièce d'identité (optionnel)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                    <span>Télécharger un fichier</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">ou glisser-déposer</p>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, PDF jusqu'à 10MB
                </p>
                {formData.idDocument && (
                  <p className="text-sm text-green-600 mt-2">
                    Fichier sélectionné: {formData.idDocument.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">Important</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Votre demande sera envoyée au propriétaire pour validation</li>
              <li>• Le propriétaire peut accepter ou refuser votre demande</li>
              <li>• Vous recevrez une notification de sa décision</li>
              <li>• En cas d'acceptation, vous pourrez accéder à votre espace locataire</li>
            </ul>
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
              {loading ? 'Envoi...' : 'Envoyer la demande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PropertyRequestForm;
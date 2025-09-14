import React, { useState } from 'react';
import { X, Calendar, Clock, User, Mail, Phone, MessageSquare, AlertTriangle } from 'lucide-react';
import { useVisitRequests } from '../../hooks/useVisitRequests';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface VisitRequestFormProps {
  property: any;
  unit?: any | null;
  onClose: () => void;
}

const VisitRequestForm: React.FC<VisitRequestFormProps> = ({ property, unit, onClose }) => {
  const { user } = useAuth();
  const { addVisitRequest, visitRequests } = useVisitRequests();
  
  const [formData, setFormData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    message: '',
    selectedDate: '',
    selectedTime: '',
    communicationPreference: user?.preferences?.aiCommunication || 'email' as 'email' | 'sms',
  });

  const [loading, setLoading] = useState(false);

  const [availableSlots] = useState(() => {
    // Generate available slots for the next 14 days
    const slots: any[] = [];
    const today = new Date();
    
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      const dateStr = date.toISOString().split('T')[0];
      const times = ['09:00', '11:00', '14:00', '16:00', '18:00'];
      
      times.forEach(time => {
        const slotId = `${dateStr}-${time}`;
        const isBooked = visitRequests.some(req => 
          req.property_id === property.id && 
          req.visit_date === dateStr &&
          req.visit_time === time &&
          req.status !== 'cancelled'
        );
        
        if (!isBooked) {
          slots.push({
            id: slotId,
            date: dateStr,
            time,
            available: true,
          });
        }
      });
    }
    
    return slots;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (!formData.selectedDate || !formData.selectedTime) {
        throw new Error('Veuillez sélectionner une date et une heure pour la visite.');
      }

      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
        throw new Error('Veuillez remplir tous les champs obligatoires.');
      }

      const slotId = `${formData.selectedDate}-${formData.selectedTime}`;
      
      const visitRequestData = {
        property_id: property.id,
        unit_id: unit?.id,
        tenant_id: user?.id || '',
        slot_id: slotId,
        status: 'pending',
        tenant_info: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          communicationPreference: formData.communicationPreference,
        },
        visit_date: formData.selectedDate,
        visit_time: formData.selectedTime,
        request_date: new Date().toISOString(),
      };

      await addVisitRequest(visitRequestData);

      // Créer notification pour le propriétaire
      try {
        await supabase
        .from('notifications')
        .insert({
          user_id: property.owner_id,
          type: 'general',
          title: 'Nouvelle demande de visite',
          message: `${formData.firstName} ${formData.lastName} souhaite visiter ${unit ? `la chambre ${unit.name}` : 'votre logement'} - ${property.name} le ${new Date(formData.selectedDate).toLocaleDateString('fr-FR')} à ${formData.selectedTime}`,
          read: false,
          data: {
            property_id: property.id,
            unit_id: unit?.id,
            visit_date: formData.selectedDate,
            visit_time: formData.selectedTime,
            tenant_id: user?.id
          }
        });
      } catch (notificationError) {
        console.warn('Notification non envoyée:', notificationError);
        // Ne pas faire échouer la demande principale
      }

      alert('✅ Votre demande de visite a été envoyée au propriétaire !');
      onClose();
    } catch (error) {
      console.error('Error submitting visit request:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'envoi de la demande de visite');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  // Group slots by date
  const slotsByDate = availableSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Demande de visite
              {unit && ` - ${unit.name}`}
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

          {/* Visit Scheduling */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Planifier la visite
            </h3>
            
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {Object.entries(slotsByDate).map(([date, slots]) => (
                <div key={date} className="border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-3">
                    {formatDate(date)}
                  </h5>
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            selectedDate: slot.date,
                            selectedTime: slot.time
                          }));
                        }}
                        className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                          formData.selectedDate === slot.date && formData.selectedTime === slot.time
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Clock className="w-4 h-4 mx-auto mb-1" />
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {formData.selectedDate && formData.selectedTime && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h5 className="font-medium text-blue-900 mb-2">Créneau sélectionné :</h5>
                <p className="text-blue-800">
                  {formatDate(formData.selectedDate)} à {formData.selectedTime}
                </p>
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              Message (optionnel)
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Questions ou informations supplémentaires..."
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

export default VisitRequestForm;
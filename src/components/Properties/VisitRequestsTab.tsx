import React, { useState } from 'react';
import { Calendar, Clock, Check, X, User, Mail, Phone, MessageSquare } from 'lucide-react';
import { useVisitRequests } from '../../hooks/useVisitRequests';
import { useProperties } from '../../hooks/useProperties';
import { useUnits } from '../../hooks/useUnits';
import { supabase } from '../../lib/supabase';

const VisitRequestsTab: React.FC = () => {
  const { visitRequests, loading, confirmVisit, cancelVisit } = useVisitRequests();
  const { properties } = useProperties();
  const { units } = useUnits();
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('pending');

  const pendingRequests = visitRequests.filter(req => req.status === 'pending');
  const filteredRequests = visitRequests.filter(req => filter === 'all' || req.status === filter);

  const getPropertyInfo = (request: any) => {
    const property = properties.find(p => p.id === request.property_id);
    const unit = request.unit_id ? units.find(u => u.id === request.unit_id) : null;
    return { property, unit };
  };

  const handleConfirmVisit = async (request: any) => {
    if (!confirm('Êtes-vous sûr de vouloir confirmer cette visite ?')) {
      return;
    }

    try {
      await confirmVisit(request.id);

      const { property, unit } = getPropertyInfo(request);
      
      // Créer notification pour le locataire
      try {
        await supabase
        .from('notifications')
        .insert({
          user_id: request.tenant_id,
          type: 'general',
          title: '✅ Visite confirmée - Détails importants',
          message: `Votre visite pour ${unit ? `la chambre ${unit.name}` : 'le logement'} - ${property?.name} est confirmée pour le ${formatDate(request.visit_date)} à ${request.visit_time}.`,
          read: false,
          data: {
            property_id: request.property_id,
            unit_id: request.unit_id,
            visit_date: request.visit_date,
            visit_time: request.visit_time
          }
        });
      } catch (notificationError) {
        console.warn('Notification non envoyée:', notificationError);
      }

      alert('✅ Visite confirmée ! Un message de confirmation a été envoyé au locataire.');
    } catch (error) {
      console.error('Error confirming visit:', error);
      alert('Erreur lors de la confirmation de la visite');
    }
  };

  const handleCancelVisit = async (request: any) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette visite ?')) {
      return;
    }

    try {
      await cancelVisit(request.id);

      // Créer notification pour le locataire
      try {
        await supabase
        .from('notifications')
        .insert({
          user_id: request.tenant_id,
          type: 'general',
          title: 'Visite annulée',
          message: `Votre visite du ${new Date(request.visit_date).toLocaleDateString('fr-FR')} à ${request.visit_time} a été annulée.`,
          read: false,
          data: {
            property_id: request.property_id,
            unit_id: request.unit_id
          }
        });
      } catch (notificationError) {
        console.warn('Notification non envoyée:', notificationError);
      }

      alert('Visite annulée. Le locataire a été notifié.');
    } catch (error) {
      console.error('Error cancelling visit:', error);
      alert('Erreur lors de l\'annulation de la visite');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Demandes de visite</h1>
          <p className="text-gray-600">Gérez les demandes de visite de vos propriétés</p>
        </div>
        {pendingRequests.length > 0 && (
          <div className="flex items-center px-3 py-2 bg-blue-100 text-blue-800 rounded-lg">
            <Calendar className="w-5 h-5 mr-2" />
            {pendingRequests.length} demande{pendingRequests.length > 1 ? 's' : ''} en attente
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex space-x-2">
          {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'Toutes' :
               status === 'pending' ? 'En attente' :
               status === 'confirmed' ? 'Confirmées' : 'Annulées'}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune demande de visite</h3>
            <p className="text-gray-500">
              {filter === 'pending' ? 'Aucune demande en attente' : 'Aucune demande trouvée'}
            </p>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const { property, unit } = getPropertyInfo(request);
            
            return (
              <div key={request.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.tenant_info.firstName} {request.tenant_info.lastName}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        request.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                        request.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {request.status === 'pending' ? 'En attente' :
                         request.status === 'confirmed' ? 'Confirmée' : 'Annulée'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2" />
                        {request.tenant_info.email}
                      </div>
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2" />
                        {request.tenant_info.phone}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formatDate(request.visit_date)} à {request.visit_time}
                      </div>
                    </div>
                  </div>
                  
                  {request.status === 'pending' && (
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleConfirmVisit(request)}
                        className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Confirmer
                      </button>
                      <button
                        onClick={() => handleCancelVisit(request)}
                        className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Annuler
                      </button>
                    </div>
                  )}
                </div>

                {/* Property Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    {unit ? `Chambre ${unit.name}` : 'Logement entier'} - {property?.name}
                  </h4>
                  <p className="text-sm text-blue-800">
                    {property?.address?.street}, {property?.address?.city}
                  </p>
                  {unit && (
                    <div className="flex items-center space-x-4 text-sm text-blue-700 mt-2">
                      <span>{unit.area} m²</span>
                      <span className="font-semibold">{unit.rent}$/mois</span>
                    </div>
                  )}
                </div>

                {/* Message */}
                {request.tenant_info.message && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Message du visiteur
                    </h4>
                    <p className="text-sm text-gray-700">{request.tenant_info.message}</p>
                  </div>
                )}

                {/* Visit Details */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-yellow-600 mr-3" />
                    <div>
                      <h4 className="font-medium text-yellow-900">Détails de la visite</h4>
                      <p className="text-sm text-yellow-800">
                        {formatDate(request.visit_date)} à {request.visit_time}
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Demande envoyée le {new Date(request.request_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default VisitRequestsTab;
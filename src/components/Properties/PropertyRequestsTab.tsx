import React, { useState } from 'react';
import { Check, X, User, Mail, Phone, FileText, MessageSquare, Calendar, AlertCircle } from 'lucide-react';
import { usePropertyRequests } from '../../hooks/usePropertyRequests';
import { useProperties } from '../../hooks/useProperties';
import { useUnits } from '../../hooks/useUnits';
import { useTenants } from '../../hooks/useTenants';
import { supabase } from '../../lib/supabase';

const PropertyRequestsTab: React.FC = () => {
  const { requests, loading, acceptRequest, rejectRequest } = usePropertyRequests();
  const { properties, updateProperty } = useProperties();
  const { units, updateUnit } = useUnits();
  const { addTenant } = useTenants();
  const [filter, setFilter] = useState<'all' | 'en_attente' | 'acceptee' | 'rejetee'>('en_attente');

  const pendingRequests = requests.filter(req => req.status === 'en_attente');
  const filteredRequests = requests.filter(req => filter === 'all' || req.status === filter);

  const getPropertyInfo = (request: any) => {
    const property = properties.find(p => p.id === request.property_id);
    const unit = request.unit_id ? units.find(u => u.id === request.unit_id) : null;
    return { property, unit };
  };

  const handleAcceptRequest = async (request: any) => {
    const { property, unit } = getPropertyInfo(request);
    if (!property) return;

    if (!confirm('Êtes-vous sûr de vouloir accepter cette demande de logement ?')) {
      return;
    }

    try {
      // Update request status
      await acceptRequest(request.id);

      // Create tenant
      const newTenant = {
        user_id: request.tenant_id,
        property_id: property.id,
        unit_id: unit?.id,
        lease_start: new Date().toISOString().split('T')[0],
        lease_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year lease
        monthly_rent: unit?.rent || property.rent || 0,
        deposit_paid: 0,
        payment_due_date: 1,
        emergency_contact: {
          name: '',
          phone: '',
          relationship: '',
        },
        status: 'active'
      };

      await addTenant(newTenant);

      // Update property/unit status to occupied
      if (unit) {
        await updateUnit(unit.id, { status: 'occupe' });
      } else {
        await updateProperty(property.id, { status: 'occupe' });
      }

      // Send notification via Supabase function
      try {
        await supabase
        .from('notifications')
        .insert({
          user_id: request.tenant_id,
          type: 'general',
          title: '🎉 DEMANDE ACCEPTÉE - Bienvenue chez vous !',
          message: `Félicitations ! Votre demande pour ${unit ? `la chambre ${unit.name}` : 'le logement entier'} - ${property.name} a été acceptée.`,
          read: false,
          data: {
            property_id: property.id,
            unit_id: unit?.id
          }
        });
      } catch (notificationError) {
        console.warn('Notification non envoyée:', notificationError);
      }

      alert('🎉 Demande acceptée ! Un message de bienvenue a été envoyé au locataire.');
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Erreur lors de l\'acceptation de la demande');
    }
  };

  const handleRejectRequest = async (request: any) => {
    const { property, unit } = getPropertyInfo(request);
    if (!property) return;

    if (!confirm('Êtes-vous sûr de vouloir refuser cette demande de logement ?')) {
      return;
    }

    try {
      // Update request status
      await rejectRequest(request.id);

      // Update property/unit status back to available
      if (unit) {
        await updateUnit(unit.id, { status: 'libre' });
      } else {
        await updateProperty(property.id, { status: 'libre' });
      }

      // Créer notification pour le locataire
      try {
        await supabase
        .from('notifications')
        .insert({
          user_id: request.tenant_id,
          type: 'general',
          title: '📋 Réponse à votre demande de logement',
          message: `Nous regrettons de vous informer que votre demande pour ${unit ? `la chambre ${unit.name}` : 'le logement entier'} - ${property.name} n'a pas pu être acceptée.`,
          read: false,
          data: {
            property_id: property.id,
            unit_id: unit?.id
          }
        });
      } catch (notificationError) {
        console.warn('Notification non envoyée:', notificationError);
      }

      alert('📋 Demande refusée. Un message a été envoyé au locataire.');
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Erreur lors du refus de la demande');
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Demandes de logement</h1>
          <p className="text-gray-600">Gérez les demandes de vos locataires potentiels</p>
        </div>
        {pendingRequests.length > 0 && (
          <div className="flex items-center px-3 py-2 bg-orange-100 text-orange-800 rounded-lg">
            <AlertCircle className="w-5 h-5 mr-2" />
            {pendingRequests.length} demande{pendingRequests.length > 1 ? 's' : ''} en attente
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex space-x-2">
          {(['all', 'en_attente', 'acceptee', 'rejetee'] as const).map((status) => (
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
               status === 'en_attente' ? 'En attente' :
               status === 'acceptee' ? 'Acceptées' : 'Refusées'}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune demande</h3>
            <p className="text-gray-500">
              {filter === 'en_attente' ? 'Aucune demande en attente' : 'Aucune demande trouvée'}
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
                        request.status === 'en_attente' ? 'bg-orange-100 text-orange-800' :
                        request.status === 'acceptee' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {request.status === 'en_attente' ? 'En attente' :
                         request.status === 'acceptee' ? 'Acceptée' : 'Refusée'}
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
                        Demande envoyée le {new Date(request.request_date).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                  
                  {request.status === 'en_attente' && (
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleAcceptRequest(request)}
                        className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Accepter
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request)}
                        className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Refuser
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
                      Message du candidat
                    </h4>
                    <p className="text-sm text-gray-700">{request.tenant_info.message}</p>
                  </div>
                )}

                {/* ID Document */}
                {request.tenant_info.idDocument && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FileText className="w-4 h-4 mr-2" />
                    <button 
                      onClick={() => window.open(request.tenant_info.idDocument, '_blank')}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Voir la pièce d'identité
                    </button>
                  </div>
                )}

                {/* Response Date */}
                {request.response_date && (
                  <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
                    Réponse envoyée le {new Date(request.response_date).toLocaleDateString('fr-FR')}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PropertyRequestsTab;
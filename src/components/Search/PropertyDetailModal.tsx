import React, { useState } from 'react';
import { X, MapPin, Bed, Bath, Square, Calendar, Clock, User, Eye, Home, Wrench, Image, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { Property, Unit, VisitSlot, VisitRequest } from '../../types';
import { useVisitRequests } from '../../hooks/useVisitRequests';
import { usePropertyRequests } from '../../hooks/usePropertyRequests';
import { useTenants } from '../../hooks/useTenants';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { usePropertyEquipment } from '../../hooks/usePropertyEquipment';
import { supabase } from '../../lib/supabase';
import VisitRequestForm from './VisitRequestForm';

interface PropertyDetailModalProps {
  property: Property;
  units: Unit[];
  onClose: () => void;
  onJoinProperty: (property: Property, unit?: Unit) => void;
}

const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({ 
  property, 
  units, 
  onClose, 
  onJoinProperty 
}) => {
  const { user } = useAuth();
  const { visitRequests } = useVisitRequests();
  const { requests } = usePropertyRequests();
  const { tenants } = useTenants();
  const { addNotification } = useNotifications();
  const { equipment } = usePropertyEquipment(property.id);
  const [showVisitRequestForm, setShowVisitRequestForm] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [propertyPhotos, setPropertyPhotos] = useState<any[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loadingPhotos, setLoadingPhotos] = useState(true);

  // Charger les photos de la propriété
  React.useEffect(() => {
    const loadPropertyPhotos = async () => {
      try {
        const { data, error } = await supabase
          .from('property_photos')
          .select('*')
          .eq('property_id', property.id)
          .order('is_main', { ascending: false })
          .order('room_name');

        if (error) throw error;
        setPropertyPhotos(data || []);
      } catch (error) {
        console.error('Error loading property photos:', error);
      } finally {
        setLoadingPhotos(false);
      }
    };

    loadPropertyPhotos();
  }, [property.id]);

  const availableUnits = units.filter(unit => unit.status === 'libre');

  const handleVisitRequest = (unit?: Unit) => {
    setSelectedUnit(unit || null);
    setShowVisitRequestForm(true);
  };

  const hasUserVisitRequest = (property: Property, unit?: Unit) => {
    return visitRequests.some(req => 
      req.tenant_id === user?.id &&
      req.property_id === property.id &&
      (unit ? req.unit_id === unit.id : !req.unit_id) &&
      (req.status === 'confirmed' || req.status === 'completed')
    );
  };

  const hasUserRequested = (property: Property, unit?: Unit) => {
    return requests.some(req => 
      req.tenant_id === user?.id &&
      ((unit && req.unit_id === unit.id) || (!unit && req.property_id === property.id))
    );
  };

  const isUserTenant = (property: Property, unit?: Unit) => {
    return tenants.some(tenant => 
      tenant.user_id === user?.id &&
      tenant.property_id === property.id &&
      (unit ? tenant.unit_id === unit.id : !tenant.unit_id)
    );
  };

  const canJoinProperty = (property: Property, unit?: Unit) => {
    const visitConfirmed = hasUserVisitRequest(property, unit);
    const notAlreadyRequested = !hasUserRequested(property, unit);
    const notAlreadyTenant = !isUserTenant(property, unit);
    
    return visitConfirmed && notAlreadyRequested && notAlreadyTenant;
  };

  const getRequestStatus = (property: Property, unit?: Unit) => {
    const request = requests.find(req => 
      req.tenant_id === user?.id &&
      ((unit && req.unit_id === unit.id) || (!unit && req.property_id === property.id))
    );
    return request?.status;
  };

  const isRequestAccepted = (property: Property, unit?: Unit) => {
    return getRequestStatus(property, unit) === 'acceptee';
  };

  const isRequestRejected = (property: Property, unit?: Unit) => {
    return getRequestStatus(property, unit) === 'rejetee';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">{property.name}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex items-center text-gray-500 mt-2">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{property.address.street}, {property.address.city}</span>
          </div>
        </div>

        <div className="p-6">
          {/* Property Images Gallery */}
          <div className="mb-6">
            {loadingPhotos ? (
              <div className="h-64 bg-gray-200 rounded-xl flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : propertyPhotos.length > 0 ? (
              <div className="relative">
                <div className="h-64 rounded-xl overflow-hidden">
                  <img
                    src={propertyPhotos[currentPhotoIndex]?.photo_url}
                    alt={propertyPhotos[currentPhotoIndex]?.description || 'Photo de la propriété'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm">
                    {propertyPhotos[currentPhotoIndex]?.room_name === 'exterior' ? 'Extérieur' :
                     propertyPhotos[currentPhotoIndex]?.room_name === 'living_room' ? 'Salon' :
                     propertyPhotos[currentPhotoIndex]?.room_name === 'kitchen' ? 'Cuisine' :
                     propertyPhotos[currentPhotoIndex]?.room_name === 'bedroom' ? 'Chambre' :
                     propertyPhotos[currentPhotoIndex]?.room_name === 'bathroom' ? 'Salle de bain' :
                     propertyPhotos[currentPhotoIndex]?.room_name === 'balcony' ? 'Balcon' :
                     propertyPhotos[currentPhotoIndex]?.room_name === 'parking' ? 'Parking' :
                     propertyPhotos[currentPhotoIndex]?.room_name === 'common_area' ? 'Espace commun' :
                     propertyPhotos[currentPhotoIndex]?.room_name || 'Photo'}
                  </div>
                </div>
                
                {propertyPhotos.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentPhotoIndex(prev => 
                        prev === 0 ? propertyPhotos.length - 1 : prev - 1
                      )}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentPhotoIndex(prev => 
                        prev === propertyPhotos.length - 1 ? 0 : prev + 1
                      )}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    
                    <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                      {currentPhotoIndex + 1} / {propertyPhotos.length}
                    </div>
                  </>
                )}
                
                {/* Thumbnails */}
                {propertyPhotos.length > 1 && (
                  <div className="flex space-x-2 mt-4 overflow-x-auto">
                    {propertyPhotos.map((photo, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentPhotoIndex(index)}
                        className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                          index === currentPhotoIndex ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={photo.photo_url}
                          alt={photo.description}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-64 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-2">
                    {property.type === 'entire' ? '🏠' : '🛏️'}
                  </div>
                  <p className="text-gray-500 text-sm">Aucune photo disponible</p>
                </div>
              </div>
            )}
          </div>

          {/* Property Images Gallery */}
          <div className="mb-6">
            {loadingPhotos ? (
              <div className="h-64 bg-gray-200 rounded-xl flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : propertyPhotos.length > 0 ? (
              <div className="relative">
                <div className="h-64 rounded-xl overflow-hidden">
                  <img
                    src={propertyPhotos[currentPhotoIndex]?.photo_url}
                    alt={propertyPhotos[currentPhotoIndex]?.description || 'Photo de la propriété'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm">
                    {propertyPhotos[currentPhotoIndex]?.room_name === 'exterior' ? 'Extérieur' :
                     propertyPhotos[currentPhotoIndex]?.room_name === 'living_room' ? 'Salon' :
                     propertyPhotos[currentPhotoIndex]?.room_name === 'kitchen' ? 'Cuisine' :
                     propertyPhotos[currentPhotoIndex]?.room_name === 'bedroom' ? 'Chambre' :
                     propertyPhotos[currentPhotoIndex]?.room_name === 'bathroom' ? 'Salle de bain' :
                     propertyPhotos[currentPhotoIndex]?.room_name === 'balcony' ? 'Balcon' :
                     propertyPhotos[currentPhotoIndex]?.room_name === 'parking' ? 'Parking' :
                     propertyPhotos[currentPhotoIndex]?.room_name === 'common_area' ? 'Espace commun' :
                     propertyPhotos[currentPhotoIndex]?.room_name || 'Photo'}
                  </div>
                </div>
                
                {propertyPhotos.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentPhotoIndex(prev => 
                        prev === 0 ? propertyPhotos.length - 1 : prev - 1
                      )}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentPhotoIndex(prev => 
                        prev === propertyPhotos.length - 1 ? 0 : prev + 1
                      )}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    
                    <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                      {currentPhotoIndex + 1} / {propertyPhotos.length}
                    </div>
                  </>
                )}
                
                {/* Thumbnails */}
                {propertyPhotos.length > 1 && (
                  <div className="flex space-x-2 mt-4 overflow-x-auto">
                    {propertyPhotos.map((photo, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentPhotoIndex(index)}
                        className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                          index === currentPhotoIndex ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={photo.photo_url}
                          alt={photo.description}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-64 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-2">
                    {property.type === 'entire' ? '🏠' : '🛏️'}
                  </div>
                  <p className="text-gray-500 text-sm">Aucune photo disponible</p>
                </div>
              </div>
            )}
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Détails du logement</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Type</span>
                  <span className="font-medium">
                    {property.type === 'entire' ? 'Logement entier' : 'Colocation'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Superficie totale</span>
                  <span className="font-medium flex items-center">
                    <Square className="w-4 h-4 mr-1" />
                    {property.totalArea} m²
                  </span>
                </div>
                {property.type === 'entire' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Pièces</span>
                      <span className="font-medium flex items-center">
                        <Bed className="w-4 h-4 mr-1" />
                        {property.totalRooms}½
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Salles de bain</span>
                      <span className="font-medium flex items-center">
                        <Bath className="w-4 h-4 mr-1" />
                        {property.totalBathrooms}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Loyer mensuel</span>
                      <span className="text-xl font-bold text-green-600">
                        {property.rent}$ CAD/mois
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
              <p className="text-gray-600">
                {property.description || 'Aucune description disponible.'}
              </p>
            </div>
          </div>

          {/* Equipment */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Wrench className="w-5 h-5 mr-2" />
              Équipements inclus ({equipment.length})
            </h3>
            
            {equipment.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Aucun équipement spécifié</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {equipment.map((item) => (
                  <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.condition === 'excellent' ? 'bg-green-100 text-green-800' :
                        item.condition === 'good' ? 'bg-blue-100 text-blue-800' :
                        item.condition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.condition === 'excellent' ? 'Excellent' :
                         item.condition === 'good' ? 'Bon' :
                         item.condition === 'fair' ? 'Correct' : 'Mauvais'}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 capitalize">{item.category}</span>
                      {item.included_in_rent && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Inclus
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Common Areas for shared properties */}
          {property.type === 'shared' && property.commonAreas && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Espaces communs</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(property.commonAreas).map(([key, value]) => {
                  if (!value) return null;
                  const labels = {
                    kitchen: 'Cuisine',
                    fridge: 'Réfrigérateur',
                    microwave: 'Micro-ondes',
                    oven: 'Four',
                    dishwasher: 'Lave-vaisselle',
                    bathroom: 'Salle de bain',
                    laundry: 'Buanderie',
                    livingRoom: 'Salon',
                    wifi: 'WiFi',
                    parking: 'Parking',
                    balcony: 'Balcon',
                    garden: 'Jardin',
                    storage: 'Rangement'
                  };
                  return (
                    <div key={key} className="flex items-center text-sm text-gray-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                      {labels[key as keyof typeof labels]}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Units for shared properties */}
          {property.type === 'shared' && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Chambres disponibles ({availableUnits.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableUnits.map((unit) => (
                  <div key={unit.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{unit.name}</h4>
                      <span className="text-lg font-bold text-green-600">{unit.rent}$/mois</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mb-3">
                      <Square className="w-4 h-4 mr-1" />
                      {unit.area} m²
                    </div>
                    <div className="flex space-x-2">
                      {isUserTenant(property, unit) ? (
                        <button 
                          disabled
                          className="flex-1 bg-green-400 text-white py-2 px-3 rounded-lg cursor-not-allowed text-sm"
                        >
                          Votre chambre
                        </button>
                      ) : isRequestAccepted(property, unit) ? (
                        <button 
                          disabled
                          className="flex-1 bg-green-400 text-white py-2 px-3 rounded-lg cursor-not-allowed text-sm"
                        >
                          Demande acceptée
                        </button>
                      ) : isRequestRejected(property, unit) ? (
                        <button 
                          disabled
                          className="flex-1 bg-red-400 text-white py-2 px-3 rounded-lg cursor-not-allowed text-sm"
                        >
                          Demande refusée
                        </button>
                      ) : hasUserRequested(property, unit) ? (
                        <button 
                          disabled
                          className="flex-1 bg-gray-400 text-white py-2 px-3 rounded-lg cursor-not-allowed text-sm"
                        >
                          Demande envoyée
                        </button>
                      ) : canJoinProperty(property, unit) ? (
                        <>
                          <button
                            onClick={() => handleVisitRequest(unit)}
                            className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            Programmer visite
                          </button>
                          <button
                            onClick={() => onJoinProperty(property, unit)}
                            className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors text-sm"
                          >
                            Rejoindre
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleVisitRequest(unit)}
                          className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Programmer une visite
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions for entire property */}
          {property.type === 'entire' && (
            <div className="flex space-x-4">
              {isUserTenant(property) ? (
                <button
                  disabled
                  className="flex-1 bg-green-400 text-white py-3 px-6 rounded-lg cursor-not-allowed flex items-center justify-center"
                >
                  <Home className="w-5 h-5 mr-2" />
                  Votre logement
                </button>
              ) : isRequestAccepted(property) ? (
                <button
                  disabled
                  className="flex-1 bg-green-400 text-white py-3 px-6 rounded-lg cursor-not-allowed flex items-center justify-center"
                >
                  Demande acceptée
                </button>
              ) : isRequestRejected(property) ? (
                <button
                  disabled
                  className="flex-1 bg-red-400 text-white py-3 px-6 rounded-lg cursor-not-allowed flex items-center justify-center"
                >
                  Demande refusée
                </button>
              ) : hasUserRequested(property) ? (
                <button
                  disabled
                  className="flex-1 bg-gray-400 text-white py-3 px-6 rounded-lg cursor-not-allowed flex items-center justify-center"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Demande envoyée
                </button>
              ) : canJoinProperty(property) ? (
                <>
                  <button
                    onClick={() => handleVisitRequest()}
                    className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Programmer une visite
                  </button>
                  <button
                    onClick={() => onJoinProperty(property)}
                    className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <User className="w-5 h-5 mr-2" />
                    Rejoindre ce logement
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleVisitRequest()}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Programmer une visite
                </button>
              )}
            </div>
          )}
        </div>

        {/* Visit Request Form */}
        {showVisitRequestForm && (
          <VisitRequestForm
            property={property}
            unit={selectedUnit}
            onClose={() => {
              setShowVisitRequestForm(false);
              setSelectedUnit(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PropertyDetailModal;
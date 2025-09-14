import React, { useState } from 'react';
import { Plus, X, Upload, Wrench, Trash2, Camera, Image } from 'lucide-react';
import { useProperties } from '../../hooks/useProperties';
import { useUnits } from '../../hooks/useUnits';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { useTranslation } from '../../hooks/useTranslation';
import { supabase } from '../../lib/supabase';

interface PropertyFormProps {
  onClose: () => void;
  property?: any;
}

const PropertyForm: React.FC<PropertyFormProps> = ({ onClose, property }) => {
  const { t, getCurrencySymbol } = useTranslation();
  const { user } = useAuth();
  const { addProperty, updateProperty } = useProperties();
  const { addUnit } = useUnits();
  const { canAddProperty } = useSubscription();
  
  const [formData, setFormData] = useState({
    name: property?.name || '',
    address: {
      street: property?.address?.street || '',
      apartment: property?.address?.apartment || '',
      postal_code: property?.address?.postal_code || '',
      city: property?.address?.city || '',
      province: property?.address?.province || '',
      country: property?.address?.country || 'Canada',
    },
    type: property?.type || 'entire',
    total_rooms: property?.total_rooms || 1,
    total_bathrooms: property?.total_bathrooms || 1,
    total_area: property?.total_area || 0,
    description: property?.description || '',
    rent: property?.rent || 0,
  });

  const [propertyUnits, setPropertyUnits] = useState<any[]>([
    { name: '', area: 0, rent: 0, status: 'libre', equipment: [] }
  ]);
  
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [propertyPhotos, setPropertyPhotos] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

  // Load existing equipment if editing
  React.useEffect(() => {
    if (property?.id) {
      loadPropertyEquipment();
      loadPropertyPhotos();
    }
  }, [property]);

  const loadPropertyEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('property_equipment')
        .select('*')
        .eq('property_id', property.id);

      if (error) throw error;
      setEquipmentList(data || []);
    } catch (error) {
      console.error('Error loading equipment:', error);
    }
  };

  const loadPropertyPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('property_photos')
        .select('*')
        .eq('property_id', property.id)
        .order('room_name');

      if (error) throw error;
      setPropertyPhotos(data || []);
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  const addEquipment = () => {
    setEquipmentList(prev => [...prev, {
      category: 'other',
      name: '',
      description: '',
      condition: 'good',
      included_in_rent: true
    }]);
  };

  const updateEquipment = (index: number, field: string, value: any) => {
    setEquipmentList(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const removeEquipment = (index: number) => {
    setEquipmentList(prev => prev.filter((_, i) => i !== index));
  };

  const saveEquipment = async (propertyId: string) => {
    try {
      // Supprimer les équipements existants
      await supabase
        .from('property_equipment')
        .delete()
        .eq('property_id', propertyId);

      // Ajouter les nouveaux équipements
      const equipmentToSave = equipmentList
        .filter(eq => eq.name.trim())
        .map(eq => ({
          property_id: propertyId,
          category: eq.category,
          name: eq.name,
          description: eq.description,
          condition: eq.condition,
          included_in_rent: eq.included_in_rent
        }));

      if (equipmentToSave.length > 0) {
        const { error } = await supabase
          .from('property_equipment')
          .insert(equipmentToSave);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving equipment:', error);
      throw error;
    }
  };

  const savePropertyPhotos = async (propertyId: string) => {
    try {
      // Supprimer les photos existantes
      await supabase
        .from('property_photos')
        .delete()
        .eq('property_id', propertyId);

      // Ajouter les nouvelles photos
      const photosToSave = propertyPhotos
        .filter(photo => photo.file || photo.url)
        .map(photo => ({
          property_id: propertyId,
          room_name: photo.room_name,
          photo_url: photo.file ? URL.createObjectURL(photo.file) : photo.url,
          description: photo.description || '',
          is_main: photo.is_main || false
        }));

      if (photosToSave.length > 0) {
        const { error } = await supabase
          .from('property_photos')
          .insert(photosToSave);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving photos:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (property) {
        await updateProperty(property.id, formData);
        await saveEquipment(property.id);
        await savePropertyPhotos(property.id);
      } else {
        const newProperty = await addProperty(formData);
        
        // Save equipment for new property
        if (newProperty) {
          await saveEquipment(newProperty.id);
          await savePropertyPhotos(newProperty.id);
        }
        
        // Add units if it's a shared property
        if (formData.type === 'shared' && newProperty) {
          for (const unit of propertyUnits) {
            if (unit.name && unit.rent > 0) {
              await addUnit({
                property_id: newProperty.id,
                name: unit.name,
                area: unit.area,
                rent: unit.rent,
                status: 'libre',
                equipment: unit.equipment || []
              });
            }
          }
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving property:', error);
      alert('Erreur lors de la sauvegarde de la propriété');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUnit = () => {
    setPropertyUnits(prev => [...prev, {
      name: '',
      area: 0,
      rent: 0,
      status: 'libre',
      equipment: []
    }]);
  };

  const removeUnit = (index: number) => {
    setPropertyUnits(prev => prev.filter((_, i) => i !== index));
  };

  const updateUnit = (index: number, field: string, value: any) => {
    setPropertyUnits(prev => prev.map((unit, i) => 
      i === index ? { ...unit, [field]: value } : unit
    ));
  };

  const addPropertyPhoto = () => {
    setPropertyPhotos(prev => [...prev, {
      room_name: '',
      description: '',
      file: null,
      url: '',
      is_main: false
    }]);
  };

  const updatePropertyPhoto = (index: number, field: string, value: any) => {
    setPropertyPhotos(prev => prev.map((photo, i) => 
      i === index ? { ...photo, [field]: value } : photo
    ));
  };

  const removePropertyPhoto = (index: number) => {
    setPropertyPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handlePhotoFileChange = (index: number, file: File) => {
    updatePropertyPhoto(index, 'file', file);
    updatePropertyPhoto(index, 'url', URL.createObjectURL(file));
  };

  const equipmentCategories = [
    { value: 'kitchen', label: 'Cuisine' },
    { value: 'bathroom', label: 'Salle de bain' },
    { value: 'laundry', label: 'Buanderie' },
    { value: 'heating', label: 'Chauffage' },
    { value: 'cooling', label: 'Climatisation' },
    { value: 'security', label: 'Sécurité' },
    { value: 'entertainment', label: 'Divertissement' },
    { value: 'furniture', label: 'Mobilier' },
    { value: 'other', label: 'Autre' },
  ];

  const conditionOptions = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Bon' },
    { value: 'fair', label: 'Correct' },
    { value: 'poor', label: 'Mauvais' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {property ? 'Modifier la propriété' : 'Ajouter une propriété'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la propriété *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            {/* Address Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Adresse</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse *
                  </label>
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, street: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123 Rue de la Paix"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Appartement
                  </label>
                  <input
                    type="text"
                    value={formData.address.apartment}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, apartment: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="App 4B"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code postal *
                  </label>
                  <input
                    type="text"
                    value={formData.address.postal_code}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, postal_code: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="H1A 1A1"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ville *
                  </label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, city: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Montréal"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Province *
                  </label>
                  <select
                    value={formData.address.province}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, province: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sélectionner une province</option>
                    <option value="AB">Alberta</option>
                    <option value="BC">Colombie-Britannique</option>
                    <option value="MB">Manitoba</option>
                    <option value="NB">Nouveau-Brunswick</option>
                    <option value="NL">Terre-Neuve-et-Labrador</option>
                    <option value="NS">Nouvelle-Écosse</option>
                    <option value="ON">Ontario</option>
                    <option value="PE">Île-du-Prince-Édouard</option>
                    <option value="QC">Québec</option>
                    <option value="SK">Saskatchewan</option>
                    <option value="NT">Territoires du Nord-Ouest</option>
                    <option value="NU">Nunavut</option>
                    <option value="YT">Yukon</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Property Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Type de logement *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                formData.type === 'entire' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="type"
                  value="entire"
                  checked={formData.type === 'entire'}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="sr-only"
                />
                <div className="flex-1 text-center">
                  <div className="text-2xl mb-2">🏠</div>
                  <div className="font-medium">Logement entier</div>
                  <div className="text-sm text-gray-500">Un seul locataire</div>
                </div>
              </label>
              <label className={`flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                formData.type === 'shared' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="type"
                  value="shared"
                  checked={formData.type === 'shared'}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="sr-only"
                />
                <div className="flex-1 text-center">
                  <div className="text-2xl mb-2">🛏️</div>
                  <div className="font-medium">Colocation</div>
                  <div className="text-sm text-gray-500">Chambres séparées</div>
                </div>
              </label>
            </div>
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {formData.type === 'entire' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de pièces
                </label>
                <select
                  value={formData.total_rooms}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_rooms: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={1}>1½</option>
                  <option value={2}>2½</option>
                  <option value={3}>3½</option>
                  <option value={4}>4½</option>
                  <option value={5}>5½</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salles de bain
              </label>
              <input
                type="number"
                min="1"
                value={formData.total_bathrooms}
                onChange={(e) => setFormData(prev => ({ ...prev, total_bathrooms: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Superficie (m²)
              </label>
              <input
                type="number"
                value={formData.total_area}
                onChange={(e) => setFormData(prev => ({ ...prev, total_area: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Rent for entire property */}
          {formData.type === 'entire' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loyer mensuel ($)
              </label>
              <input
                type="number"
                value={formData.rent}
                onChange={(e) => setFormData(prev => ({ ...prev, rent: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Units for shared property */}
          {formData.type === 'shared' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Chambres</h3>
                <button
                  type="button"
                  onClick={handleAddUnit}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une chambre
                </button>
              </div>
              
              {propertyUnits.map((unit, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Chambre {index + 1}</h4>
                    {propertyUnits.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeUnit(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom/Numéro
                      </label>
                      <input
                        type="text"
                        value={unit.name}
                        onChange={(e) => updateUnit(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="ex: Chambre A"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Superficie (m²)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={unit.area}
                        onChange={(e) => updateUnit(index, 'area', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Loyer ($)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={unit.rent}
                        onChange={(e) => updateUnit(index, 'rent', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Description de la propriété..."
            />
          </div>

          {/* Equipment Management */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Wrench className="w-5 h-5 mr-2" />
                Équipements inclus
              </h3>
              <button
                type="button"
                onClick={addEquipment}
                className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter équipement
              </button>
            </div>
            
            {equipmentList.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Aucun équipement ajouté</p>
                <button
                  type="button"
                  onClick={addEquipment}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Ajouter le premier équipement
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {equipmentList.map((equipment, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Équipement {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeEquipment(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Catégorie
                        </label>
                        <select
                          value={equipment.category}
                          onChange={(e) => updateEquipment(index, 'category', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {equipmentCategories.map(cat => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nom
                        </label>
                        <input
                          type="text"
                          value={equipment.name}
                          onChange={(e) => updateEquipment(index, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="ex: Réfrigérateur"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          État
                        </label>
                        <select
                          value={equipment.condition}
                          onChange={(e) => updateEquipment(index, 'condition', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {conditionOptions.map(cond => (
                            <option key={cond.value} value={cond.value}>
                              {cond.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="flex items-center">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={equipment.included_in_rent}
                            onChange={(e) => updateEquipment(index, 'included_in_rent', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Inclus dans le loyer</span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description (optionnel)
                      </label>
                      <input
                        type="text"
                        value={equipment.description}
                        onChange={(e) => updateEquipment(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Détails supplémentaires..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Photos par pièce */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Camera className="w-5 h-5 mr-2" />
                Photos par pièce
              </h3>
              <button
                type="button"
                onClick={addPropertyPhoto}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter photo
              </button>
            </div>
            
            {propertyPhotos.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <Image className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Aucune photo ajoutée</p>
                <button
                  type="button"
                  onClick={addPropertyPhoto}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Ajouter la première photo
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {propertyPhotos.map((photo, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Photo {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removePropertyPhoto(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Pièce/Zone
                        </label>
                        <select
                          value={photo.room_name}
                          onChange={(e) => updatePropertyPhoto(index, 'room_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Sélectionner une pièce</option>
                          <option value="exterior">Extérieur</option>
                          <option value="living_room">Salon</option>
                          <option value="kitchen">Cuisine</option>
                          <option value="bedroom">Chambre</option>
                          <option value="bathroom">Salle de bain</option>
                          <option value="balcony">Balcon</option>
                          <option value="parking">Parking</option>
                          <option value="common_area">Espace commun</option>
                          <option value="other">Autre</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={photo.description}
                          onChange={(e) => updatePropertyPhoto(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Description de la photo"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Image
                      </label>
                      <div className="flex items-center space-x-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handlePhotoFileChange(index, file);
                            }
                          }}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={photo.is_main}
                            onChange={(e) => {
                              // S'assurer qu'une seule photo est principale
                              if (e.target.checked) {
                                setPropertyPhotos(prev => prev.map((p, i) => ({
                                  ...p,
                                  is_main: i === index
                                })));
                              } else {
                                updatePropertyPhoto(index, 'is_main', false);
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Photo principale</span>
                        </label>
                      </div>
                      
                      {photo.url && (
                        <div className="mt-2">
                          <img
                            src={photo.url}
                            alt={photo.description || `Photo ${index + 1}`}
                            className="w-32 h-24 object-cover rounded-lg border border-gray-200"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              {loading ? 'Sauvegarde...' : (property ? 'Modifier' : 'Ajouter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PropertyForm;
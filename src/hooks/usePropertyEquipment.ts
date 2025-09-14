import { useSupabaseData } from './useSupabaseData';
import { useAuth } from '../contexts/AuthContext';

interface PropertyEquipment {
  id: string;
  property_id: string;
  category: 'kitchen' | 'bathroom' | 'laundry' | 'heating' | 'cooling' | 'security' | 'entertainment' | 'furniture' | 'other';
  name: string;
  description?: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  included_in_rent: boolean;
  maintenance_date?: string;
  warranty_expiry?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function usePropertyEquipment(propertyId?: string) {
  const { user } = useAuth();
  
  const filters = propertyId ? { property_id: propertyId } : undefined;
  
  const {
    data: equipment,
    loading,
    error,
    insert,
    update,
    remove,
    refetch
  } = useSupabaseData<PropertyEquipment>('property_equipment', filters);

  const addEquipment = async (equipmentData: Omit<PropertyEquipment, 'id' | 'created_at' | 'updated_at'>) => {
    const newEquipment = {
      ...equipmentData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return await insert(newEquipment);
  };

  const updateEquipment = async (id: string, updates: Partial<PropertyEquipment>) => {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    return await update(id, updateData);
  };

  const deleteEquipment = async (id: string) => {
    return await remove(id);
  };

  const getEquipmentByCategory = (category: PropertyEquipment['category']) => {
    return equipment.filter(eq => eq.category === category);
  };

  const getIncludedEquipment = () => {
    return equipment.filter(eq => eq.included_in_rent);
  };

  const getEquipmentNeedingMaintenance = () => {
    const today = new Date();
    return equipment.filter(eq => {
      if (!eq.maintenance_date) return false;
      const maintenanceDate = new Date(eq.maintenance_date);
      const daysSince = (today.getTime() - maintenanceDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 365; // Plus d'un an depuis la dernière maintenance
    });
  };

  return {
    equipment,
    loading,
    error,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    getEquipmentByCategory,
    getIncludedEquipment,
    getEquipmentNeedingMaintenance,
    refetch
  };
}
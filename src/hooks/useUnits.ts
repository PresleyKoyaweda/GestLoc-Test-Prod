import { useSupabaseData } from './useSupabaseData';
import { useAuth } from '../contexts/AuthContext';

interface Unit {
  id: string;
  property_id: string;
  name: string;
  area: number;
  rent: number;
  status: 'libre' | 'en_attente_validation' | 'occupe';
  tenant_id?: string;
  equipment: string[];
  created_at: string;
}

export function useUnits(propertyId?: string) {
  const { user } = useAuth();
  
  const filters = propertyId ? { property_id: propertyId } : undefined;
  
  const {
    data: units,
    loading,
    error,
    insert,
    update,
    remove,
    refetch
  } = useSupabaseData<Unit>('units', filters);

  const addUnit = async (unitData: Omit<Unit, 'id' | 'created_at'>) => {
    const newUnit = {
      ...unitData,
      created_at: new Date().toISOString()
    };
    
    return await insert(newUnit);
  };

  const updateUnit = async (id: string, updates: Partial<Unit>) => {
    return await update(id, updates);
  };

  const deleteUnit = async (id: string) => {
    return await remove(id);
  };

  return {
    units,
    loading,
    error,
    addUnit,
    updateUnit,
    deleteUnit,
    refetch
  };
}
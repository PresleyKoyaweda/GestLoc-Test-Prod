import { useSupabaseData } from './useSupabaseData';
import { useAuth } from '../contexts/AuthContext';
import { Property } from '../types';

export function useProperties() {
  const { user } = useAuth();
  
  const {
    data: properties,
    loading,
    error,
    insert,
    update,
    remove,
    refetch
  } = useSupabaseData<Property>('properties', 
    user?.role === 'owner' ? { owner_id: user.id } : undefined
  );

  const addProperty = async (propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('User not authenticated');
    
    const newProperty = {
      ...propertyData,
      owner_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return await insert(newProperty);
  };

  const updateProperty = async (id: string, updates: Partial<Property>) => {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    return await update(id, updateData);
  };

  const deleteProperty = async (id: string) => {
    return await remove(id);
  };

  return {
    properties,
    loading,
    error,
    addProperty,
    updateProperty,
    deleteProperty,
    refetch
  };
}
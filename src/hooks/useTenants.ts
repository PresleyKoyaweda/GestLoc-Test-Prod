import { useSupabaseData } from './useSupabaseData';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Tenant {
  id: string;
  user_id: string;
  property_id?: string;
  unit_id?: string;
  lease_start: string;
  lease_end: string;
  monthly_rent: number;
  deposit_paid: number;
  payment_due_date: number;
  emergency_contact: any;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useTenants() {
  const { user } = useAuth();
  
  // Pour les propriétaires, récupérer tous leurs locataires
  // Pour les locataires, récupérer seulement leurs propres données
  const getFilters = () => {
    if (user?.role === 'owner') {
      return {}; // Les politiques RLS filtreront automatiquement
    } else {
      return { user_id: user?.id };
    }
  };

  const {
    data: tenants,
    loading,
    error,
    insert,
    update,
    remove,
    refetch
  } = useSupabaseData<Tenant>('tenants', getFilters());

  const addTenant = async (tenantData: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('User not authenticated');
    
    const newTenant = {
      ...tenantData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return await insert(newTenant);
  };

  const updateTenant = async (id: string, updates: Partial<Tenant>) => {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    return await update(id, updateData);
  };

  const deleteTenant = async (id: string) => {
    return await remove(id);
  };

  // Récupérer le locataire actuel (pour les utilisateurs locataires)
  const getCurrentTenant = () => {
    if (user?.role !== 'tenant') return null;
    return tenants.find(t => t.user_id === user.id);
  };

  return {
    tenants,
    loading,
    error,
    addTenant,
    updateTenant,
    deleteTenant,
    getCurrentTenant,
    refetch
  };
}
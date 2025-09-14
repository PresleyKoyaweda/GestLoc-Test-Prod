import { useSupabaseData } from './useSupabaseData';
import { useAuth } from '../contexts/AuthContext';

interface PropertyRequest {
  id: string;
  property_id?: string;
  unit_id?: string;
  tenant_id: string;
  status: 'en_attente' | 'acceptee' | 'rejetee';
  request_date: string;
  response_date?: string;
  owner_notes?: string;
  tenant_info: any;
}

export function usePropertyRequests() {
  const { user } = useAuth();
  
  const {
    data: requests,
    loading,
    error,
    insert,
    update,
    remove,
    refetch
  } = useSupabaseData<PropertyRequest>('property_requests');

  const addRequest = async (requestData: Omit<PropertyRequest, 'id' | 'request_date'>) => {
    const newRequest = {
      ...requestData,
      request_date: new Date().toISOString()
    };
    
    return await insert(newRequest);
  };

  const updateRequest = async (id: string, updates: Partial<PropertyRequest>) => {
    return await update(id, updates);
  };

  const acceptRequest = async (id: string, ownerNotes?: string) => {
    return await updateRequest(id, {
      status: 'acceptee',
      response_date: new Date().toISOString(),
      owner_notes: ownerNotes
    });
  };

  const rejectRequest = async (id: string, ownerNotes?: string) => {
    return await updateRequest(id, {
      status: 'rejetee',
      response_date: new Date().toISOString(),
      owner_notes: ownerNotes
    });
  };

  return {
    requests,
    loading,
    error,
    addRequest,
    updateRequest,
    acceptRequest,
    rejectRequest,
    refetch
  };
}
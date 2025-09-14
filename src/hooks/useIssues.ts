import { useSupabaseData } from './useSupabaseData';
import { useAuth } from '../contexts/AuthContext';

interface Issue {
  id: string;
  tenant_id: string;
  property_id?: string;
  unit_id?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'resolved';
  photos: string[];
  owner_notes?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export function useIssues() {
  const { user } = useAuth();
  
  const {
    data: issues,
    loading,
    error,
    insert,
    update,
    remove,
    refetch
  } = useSupabaseData<Issue>('issues');

  const addIssue = async (issueData: Omit<Issue, 'id' | 'created_at' | 'updated_at'>) => {
    const newIssue = {
      ...issueData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return await insert(newIssue);
  };

  const updateIssue = async (id: string, updates: Partial<Issue>) => {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    return await update(id, updateData);
  };

  const deleteIssue = async (id: string) => {
    return await remove(id);
  };

  const resolveIssue = async (id: string, ownerNotes?: string) => {
    return await updateIssue(id, {
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      owner_notes: ownerNotes
    });
  };

  return {
    issues,
    loading,
    error,
    addIssue,
    updateIssue,
    deleteIssue,
    resolveIssue,
    refetch
  };
}
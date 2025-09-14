import { useSupabaseData } from './useSupabaseData';
import { useAuth } from '../contexts/AuthContext';

interface Expense {
  id: string;
  owner_id: string;
  property_id?: string;
  unit_id?: string;
  issue_id?: string;
  description: string;
  amount: number;
  type: 'maintenance' | 'renovation' | 'utilities' | 'insurance' | 'taxes' | 'other';
  receipt_url?: string;
  date: string;
  vendor?: string;
  notes?: string;
  created_at: string;
}

export function useExpenses() {
  const { user } = useAuth();
  
  const {
    data: expenses,
    loading,
    error,
    insert,
    update,
    remove,
    refetch
  } = useSupabaseData<Expense>('expenses', 
    user?.role === 'owner' ? { owner_id: user.id } : undefined
  );

  const addExpense = async (expenseData: Omit<Expense, 'id' | 'created_at'>) => {
    if (!user) throw new Error('User not authenticated');
    
    const newExpense = {
      ...expenseData,
      owner_id: user.id,
      created_at: new Date().toISOString()
    };
    
    return await insert(newExpense);
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    return await update(id, updates);
  };

  const deleteExpense = async (id: string) => {
    return await remove(id);
  };

  return {
    expenses,
    loading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    refetch
  };
}
import { useSupabaseData } from './useSupabaseData';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Payment {
  id: string;
  tenant_id: string;
  property_id?: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: 'pending' | 'paid' | 'late' | 'overdue';
  payment_method?: string;
  transaction_id?: string;
  notes?: string;
  late_fees: number;
  created_at: string;
  updated_at: string;
}

export function usePayments() {
  const { user } = useAuth();
  
  const {
    data: payments,
    loading,
    error,
    insert,
    update,
    remove,
    refetch
  } = useSupabaseData<Payment>('payments');

  const addPayment = async (paymentData: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) => {
    const newPayment = {
      ...paymentData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return await insert(newPayment);
  };

  const updatePayment = async (id: string, updates: Partial<Payment>) => {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    return await update(id, updateData);
  };

  const markAsPaid = async (paymentId: string) => {
    return await updatePayment(paymentId, {
      status: 'paid',
      paid_date: new Date().toISOString()
    });
  };

  const markAsLate = async (paymentId: string) => {
    return await updatePayment(paymentId, {
      status: 'late'
    });
  };

  // Générer les paiements mensuels pour tous les locataires
  const generateMonthlyPayments = async () => {
    try {
      const { error } = await supabase.rpc('generate_monthly_payments');
      if (error) throw error;
      await refetch();
    } catch (err) {
      console.error('Error generating monthly payments:', err);
    }
  };

  return {
    payments,
    loading,
    error,
    addPayment,
    updatePayment,
    markAsPaid,
    markAsLate,
    generateMonthlyPayments,
    refetch
  };
}
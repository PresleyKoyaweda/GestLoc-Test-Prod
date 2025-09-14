import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SUBSCRIPTION_PLANS, PlanFeatures, SubscriptionPlan } from '../types';

interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: 'active' | 'pending' | 'suspended' | 'canceled' | 'past_due';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    } else {
      setSubscription(null);
      setIsLoading(false);
    }
  }, [user]);

  const fetchSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentPlan = () => {
    if (!subscription) return SUBSCRIPTION_PLANS.free;
    return SUBSCRIPTION_PLANS[subscription.plan];
  };

  const getFeatures = (): PlanFeatures => {
    return getCurrentPlan().features;
  };

  const canAddProperty = (currentCount: number): boolean => {
    const features = getFeatures();
    return features.maxProperties === -1 || currentCount < features.maxProperties;
  };

  const canAddTenant = (currentCount: number): boolean => {
    const features = getFeatures();
    return features.maxTenants === -1 || currentCount < features.maxTenants;
  };

  const canUseAI = (): boolean => {
    return getFeatures().aiEnabled;
  };

  const canGeneratePDF = (): boolean => {
    return getFeatures().pdfGeneration;
  };

  const canUseAdvancedReports = (): boolean => {
    return getFeatures().advancedReports;
  };

  const isSubscriptionActive = (): boolean => {
    return subscription?.status === 'active';
  };

  const isPaymentOverdue = (): boolean => {
    if (!subscription) return false;
    return subscription.status === 'past_due';
  };

  const getDaysUntilRenewal = (): number => {
    if (!subscription) return 0;
    const now = new Date();
    const renewalDate = new Date(subscription.current_period_end);
    const diffTime = renewalDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Check if user can use a specific AI agent
  const canUseAIAgent = async (agentType: string): Promise<boolean> => {
    if (!user || !canUseAI()) return false;

    try {
      const { data, error } = await supabase.rpc('can_use_ai_agent', {
        user_id_param: user.id,
        agent_type_param: agentType
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking AI agent access:', error);
      return false;
    }
  };

  // Track AI usage
  const trackAIUsage = async (agentType: string, tokensUsed: number = 0, cost: number = 0) => {
    if (!user) return;

    try {
      await supabase.rpc('track_ai_usage', {
        user_id_param: user.id,
        agent_type_param: agentType,
        tokens_used_param: tokensUsed,
        cost_param: cost
      });
    } catch (error) {
      console.error('Error tracking AI usage:', error);
    }
  };

  return {
    subscription,
    isLoading,
    currentPlan: getCurrentPlan(),
    features: getFeatures(),
    canAddProperty,
    canAddTenant,
    canUseAI,
    canGeneratePDF,
    canUseAdvancedReports,
    isSubscriptionActive,
    isPaymentOverdue,
    getDaysUntilRenewal,
    canUseAIAgent,
    trackAIUsage,
    refetch: fetchSubscription
  };
}
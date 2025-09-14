import React, { useState, useEffect } from 'react';
import { Bot, MessageSquare, FileText, Calculator, Wrench, PiggyBank, BarChart3, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { supabase } from '../../lib/supabase';

interface AIAgent {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'communication' | 'financial' | 'maintenance' | 'analysis';
  requiredPlan: 'free' | 'pro' | 'business';
  usageCount?: number;
  maxUsage?: number;
}

const aiAgents: AIAgent[] = [
  {
    id: 'communication',
    name: 'Assistant Communication',
    description: 'Génère des messages professionnels pour vos locataires',
    icon: MessageSquare,
    category: 'communication',
    requiredPlan: 'pro'
  },
  {
    id: 'payment',
    name: 'Assistant Paiements',
    description: 'Aide à la gestion et au suivi des paiements',
    icon: PiggyBank,
    category: 'financial',
    requiredPlan: 'pro'
  },
  {
    id: 'fiscal',
    name: 'Assistant Fiscal',
    description: 'Conseils fiscaux et optimisation des déclarations',
    icon: Calculator,
    category: 'financial',
    requiredPlan: 'pro'
  },
  {
    id: 'summary',
    name: 'Résumé Mensuel',
    description: 'Génère des rapports mensuels automatiques',
    icon: BarChart3,
    category: 'analysis',
    requiredPlan: 'pro'
  },
  {
    id: 'diagnostic',
    name: 'Diagnostic Problèmes',
    description: 'Analyse et propose des solutions aux problèmes techniques',
    icon: Wrench,
    category: 'maintenance',
    requiredPlan: 'business'
  },
  {
    id: 'contract',
    name: 'Générateur de Contrats',
    description: 'Crée des contrats de location personnalisés',
    icon: FileText,
    category: 'analysis',
    requiredPlan: 'business'
  }
];

const AIAgentsTab: React.FC = () => {
  const { user } = useAuth();
  const { subscription, isLoading: subscriptionLoading, canUseAIAgent, trackAIUsage } = useSubscription();
  const [usageData, setUsageData] = useState<Record<string, { count: number; max: number }>>({});
  const [loadingUsage, setLoadingUsage] = useState(true);

  useEffect(() => {
    if (user) {
      loadUsageData();
    }
  }, [user]);

  const loadUsageData = async () => {
    if (!user) return;

    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      
      const { data, error } = await supabase
        .from('ai_usage_tracking')
        .select('agent_type, usage_count')
        .eq('user_id', user.id)
        .eq('usage_month', currentMonth);

      if (error) throw error;

      const usage: Record<string, { count: number; max: number }> = {};
      
      // Get plan features for limits
      const { data: planFeatures } = await supabase
        .from('ai_plan_features')
        .select('agent_type, monthly_limit')
        .eq('plan', subscription?.plan || 'free')
        .eq('enabled', true);

      aiAgents.forEach(agent => {
        const agentUsage = data?.find(u => u.agent_type === agent.id);
        const planFeature = planFeatures?.find(f => f.agent_type === agent.id);
        
        usage[agent.id] = {
          count: agentUsage?.usage_count || 0,
          max: planFeature?.monthly_limit || 0
        };
      });

      setUsageData(usage);
    } catch (error) {
      console.error('Erreur lors du chargement des données d\'usage:', error);
    } finally {
      setLoadingUsage(false);
    }
  };

  const canUseAgent = async (agent: AIAgent): Promise<boolean> => {
    if (!user) return false;
    return await canUseAIAgent(agent.id);
  };

  const getUsageStatus = (agentId: string) => {
    const usage = usageData[agentId];
    if (!usage || usage.max === 0) return { status: 'unlimited', percentage: 0 };
    
    const percentage = (usage.count / usage.max) * 100;
    
    if (percentage >= 100) return { status: 'exhausted', percentage: 100 };
    if (percentage >= 80) return { status: 'warning', percentage };
    return { status: 'available', percentage };
  };

  const handleAgentClick = async (agent: AIAgent) => {
    try {
      const canUse = await canUseAIAgent(agent.id);
    
      if (!canUse) {
        alert(`Cette fonctionnalité nécessite un abonnement ${agent.requiredPlan.toUpperCase()}`);
        return;
      }

      const usage = getUsageStatus(agent.id);
      if (usage.status === 'exhausted') {
        alert('Limite d\'utilisation atteinte pour ce mois. Passez à un plan supérieur pour plus d\'utilisations.');
        return;
      }

      // Track usage
      await trackAIUsage(agent.id, 0, 0);
    
      // Reload usage data
      await loadUsageData();
    
      // Launch agent functionality based on type
      switch (agent.id) {
        case 'payment':
          alert('🤖 Assistant Paiements activé ! Analyse des paiements en cours...');
          break;
        case 'fiscal':
          alert('📊 Assistant Fiscal activé ! Génération du rapport fiscal...');
          break;
        case 'communication':
          alert('💬 Assistant Communication activé ! Génération de messages...');
          break;
        case 'summary':
          alert('📈 Résumé Mensuel activé ! Génération du rapport...');
          break;
        case 'diagnostic':
          alert('🔧 Diagnostic Problèmes activé ! Analyse en cours...');
          break;
        case 'contract':
          alert('📄 Générateur de Contrats activé ! Création du contrat...');
          break;
        default:
          alert(`🚀 ${agent.name} activé !`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'activation de l\'agent IA:', error);
      alert('Erreur lors de l\'activation de l\'agent IA');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'exhausted': return 'text-red-600';
      case 'unlimited': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return CheckCircle;
      case 'warning': return AlertCircle;
      case 'exhausted': return AlertCircle;
      case 'unlimited': return CheckCircle;
      default: return Clock;
    }
  };

  if (subscriptionLoading || loadingUsage) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentPlan = subscription?.plan || 'free';

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Agents IA</h1>
        <p className="text-gray-600">
          Automatisez vos tâches de gestion locative avec nos assistants intelligents
        </p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center">
            <Zap className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-900">
              Plan actuel: {currentPlan.toUpperCase()}
            </span>
          </div>
          {currentPlan === 'free' && (
            <p className="text-sm text-blue-700 mt-1">
              Passez au plan PRO pour accéder aux agents IA
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aiAgents.map((agent) => {
          const IconComponent = agent.icon;
          const usage = getUsageStatus(agent.id);
          const StatusIcon = getStatusIcon(usage.status);

          return (
            <div
              key={agent.id}
              className={`bg-white rounded-lg shadow-md p-6 transition-all duration-200 ${
                usage.status !== 'exhausted'
                  ? 'hover:shadow-lg cursor-pointer border-l-4 border-blue-500'
                  : 'opacity-60 border-l-4 border-gray-300'
              }`}
              onClick={() => handleAgentClick(agent)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-blue-100">
                    <IconComponent className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex items-center">
                  <StatusIcon className={`w-4 h-4 ${getStatusColor(usage.status)}`} />
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {agent.name}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {agent.description}
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    Plan requis: {agent.requiredPlan.toUpperCase()}
                  </span>
                  {usage.status !== 'unlimited' && (
                    <span className={getStatusColor(usage.status)}>
                      {usageData[agent.id]?.count || 0}/{usageData[agent.id]?.max || 0}
                    </span>
                  )}
                </div>
                
                {usage.status !== 'unlimited' && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        usage.status === 'available' ? 'bg-green-500' :
                        usage.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${usage.percentage}%` }}
                    ></div>
                  </div>
                )}
              </div>

              {currentPlan === 'free' && (
                <div className="mt-4 text-center">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    Mise à niveau requise
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {currentPlan === 'free' && (
        <div className="mt-8 text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <Bot className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Débloquez le potentiel de l'IA
          </h3>
          <p className="text-gray-600 mb-4">
            Passez au plan PRO pour accéder à tous nos assistants intelligents
          </p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Voir les plans
          </button>
        </div>
      )}
    </div>
  );
};

export default AIAgentsTab;
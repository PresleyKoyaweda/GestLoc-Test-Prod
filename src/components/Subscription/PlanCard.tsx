import React from 'react';
import { Check, Star } from 'lucide-react';
import { SubscriptionPlan, SUBSCRIPTION_PLANS } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

interface PlanCardProps {
  plan: SubscriptionPlan;
  isCurrentPlan: boolean;
  onSelectPlan: (plan: SubscriptionPlan) => void;
  disabled?: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, isCurrentPlan, onSelectPlan, disabled }) => {
  const planData = SUBSCRIPTION_PLANS[plan];
  const { t, formatCurrency } = useTranslation();

  const features = [
    {
      text: planData.features.maxProperties === -1 
        ? 'Propriétés illimitées' 
        : `${planData.features.maxProperties} propriété${planData.features.maxProperties > 1 ? 's' : ''}`,
      included: true
    },
    {
      text: planData.features.maxTenants === -1 
        ? 'Locataires illimités' 
        : `${planData.features.maxTenants} locataire${planData.features.maxTenants > 1 ? 's' : ''}`,
      included: true
    },
    {
      text: 'Assistants IA',
      included: planData.features.aiEnabled
    },
    {
      text: 'Génération PDF',
      included: planData.features.pdfGeneration
    },
    {
      text: 'Utilisateurs multiples',
      included: planData.features.multiUser
    },
    {
      text: 'Rapports avancés',
      included: planData.features.advancedReports
    },
    {
      text: 'IA étendue',
      included: planData.features.extendedAI
    }
  ];

  return (
    <div className={`relative bg-white rounded-2xl shadow-sm border-2 transition-all duration-200 ${
      isCurrentPlan 
        ? 'border-blue-500 ring-2 ring-blue-200' 
        : planData.popular 
          ? 'border-orange-200 hover:border-orange-300' 
          : 'border-gray-200 hover:border-gray-300'
    } ${disabled ? 'opacity-50' : ''}`}>
      {planData.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <Star className="w-3 h-3 mr-1" />
            Populaire
          </span>
        </div>
      )}

      <div className="p-8">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{planData.name}</h3>
          <p className="text-gray-500 mb-4">{planData.description}</p>
          <div className="flex items-baseline justify-center">
            <span className="text-4xl font-bold text-gray-900">{formatCurrency(planData.price)}</span>
            <span className="text-gray-500 ml-1">/mois</span>
          </div>
        </div>

        <ul className="space-y-4 mb-8">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center">
              <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                feature.included 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                <Check className="w-3 h-3" />
              </div>
              <span className={`ml-3 text-sm ${
                feature.included ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {feature.text}
              </span>
            </li>
          ))}
        </ul>

        <button
          onClick={() => onSelectPlan(plan)}
          disabled={disabled || isCurrentPlan}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors cursor-pointer ${
            isCurrentPlan
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : planData.popular
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isCurrentPlan ? 'Plan actuel' : `Choisir ${planData.name}`}
        </button>
      </div>
    </div>
  );
};

export default PlanCard;
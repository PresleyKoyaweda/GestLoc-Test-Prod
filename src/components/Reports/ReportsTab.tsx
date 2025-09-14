import React, { useState } from 'react';
import { BarChart3, Download, Calendar, DollarSign, TrendingUp, TrendingDown, PieChart, FileText } from 'lucide-react';
import { useProperties } from '../../hooks/useProperties';
import { useTenants } from '../../hooks/useTenants';
import { usePayments } from '../../hooks/usePayments';
import { useExpenses } from '../../hooks/useExpenses';
import { useSubscription } from '../../hooks/useSubscription';

interface ReportsTabProps {
  onTabChange?: (tab: string) => void;
}

const ReportsTab: React.FC<ReportsTabProps> = ({ onTabChange }) => {
  const { properties } = useProperties();
  const { tenants } = useTenants();
  const { payments } = usePayments();
  const { expenses } = useExpenses();
  const { canUseAdvancedReports, canGeneratePDF } = useSubscription();
  
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // Calculate financial metrics
  const currentDate = new Date();
  const startDate = selectedPeriod === 'month' 
    ? new Date(selectedYear, selectedMonth, 1)
    : new Date(selectedYear, 0, 1);
  const endDate = selectedPeriod === 'month'
    ? new Date(selectedYear, selectedMonth + 1, 0)
    : new Date(selectedYear, 11, 31);

  const periodPayments = payments.filter(p => {
    const paymentDate = new Date(p.due_date);
    return paymentDate >= startDate && paymentDate <= endDate;
  });

  const periodExpenses = expenses.filter(e => {
    const expenseDate = new Date(e.date);
    return expenseDate >= startDate && expenseDate <= endDate;
  });

  const totalRevenue = periodPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Payment statistics
  const paymentStats = {
    total: periodPayments.length,
    paid: periodPayments.filter(p => p.status === 'paid').length,
    late: periodPayments.filter(p => p.status === 'late').length,
    pending: periodPayments.filter(p => p.status === 'pending').length,
  };

  // Expense breakdown by type
  const expensesByType = periodExpenses.reduce((acc, expense) => {
    acc[expense.type] = (acc[expense.type] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  // Occupancy rate
  const totalUnits = properties.reduce((sum, property) => {
    return sum + (property.type === 'entire' ? 1 : 0); // Simplified for demo
  }, 0);
  const occupiedUnits = tenants.length;
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const generatePDFReport = () => {
    if (!canGeneratePDF()) {
      alert('La génération de PDF n\'est pas disponible avec votre plan actuel. Veuillez mettre à niveau vers le plan Pro ou Business.');
      return;
    }
    
    // Simulate PDF generation
    alert('Rapport PDF généré avec succès ! (Fonctionnalité simulée)');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
          <p className="text-gray-600">Analysez les performances de votre portefeuille</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={generatePDFReport}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-5 h-5 mr-2" />
            Générer PDF
          </button>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="w-5 h-5 mr-2" />
            Exporter données
          </button>
        </div>
      </div>

      {/* Period Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="month">Mensuel</option>
              <option value="year">Annuel</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {selectedPeriod === 'month' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {months.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenus</p>
              <p className="text-2xl font-bold text-green-600">{totalRevenue.toLocaleString('fr-CA')}$ CAD</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dépenses</p>
              <p className="text-2xl font-bold text-red-600">{totalExpenses.toLocaleString('fr-CA')}$ CAD</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bénéfice net</p>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netProfit.toLocaleString('fr-CA')}$
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taux d'occupation</p>
              <p className="text-2xl font-bold text-blue-600">{occupancyRate.toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Analyse des paiements
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total paiements</span>
              <span className="font-semibold">{paymentStats.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Payés</span>
              <span className="font-semibold text-green-600">{paymentStats.paid}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">En retard</span>
              <span className="font-semibold text-orange-600">{paymentStats.late}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">En attente</span>
              <span className="font-semibold text-yellow-600">{paymentStats.pending}</span>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Taux de paiement</span>
              <span>{paymentStats.total > 0 ? ((paymentStats.paid / paymentStats.total) * 100).toFixed(1) : 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${paymentStats.total > 0 ? (paymentStats.paid / paymentStats.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <PieChart className="w-5 h-5 mr-2" />
            Répartition des dépenses
          </h3>
          
          <div className="space-y-3">
            {Object.entries(expensesByType).map(([type, amount]) => {
              const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
              const typeLabels = {
                maintenance: 'Maintenance',
                renovation: 'Rénovation',
                utilities: 'Services publics',
                insurance: 'Assurance',
                taxes: 'Taxes',
                other: 'Autre',
              };
              
              return (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{typeLabels[type as keyof typeof typeLabels]}</span>
                    <span className="font-semibold">{amount.toLocaleString('fr-CA')}$</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 text-right">
                    {percentage.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>

          {Object.keys(expensesByType).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <PieChart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Aucune dépense pour cette période</p>
            </div>
          )}
        </div>

        {/* Profitability Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Analyse de rentabilité
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Revenus bruts</span>
              <span className="font-semibold text-green-600">{totalRevenue.toLocaleString('fr-CA')}$</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Dépenses totales</span>
              <span className="font-semibold text-red-600">-{totalExpenses.toLocaleString('fr-CA')}$</span>
            </div>
            <hr className="border-gray-200" />
            <div className="flex justify-between items-center">
              <span className="text-gray-900 font-medium">Bénéfice net</span>
              <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netProfit.toLocaleString('fr-CA')}$
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Marge bénéficiaire</span>
              <span className={`font-semibold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Recommandations</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {profitMargin < 10 && (
                <li>• Considérez augmenter les loyers ou réduire les dépenses</li>
              )}
              {paymentStats.late > 0 && (
                <li>• Mettez en place un système de rappel automatique</li>
              )}
              {occupancyRate < 90 && (
                <li>• Améliorez la commercialisation de vos biens vacants</li>
              )}
              {profitMargin >= 20 && (
                <li>• Excellente rentabilité ! Considérez l'expansion</li>
              )}
            </ul>
          </div>
        </div>

        {/* Advanced Reports (Premium Feature) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Rapports avancés
          </h3>
          
          {canUseAdvancedReports() ? (
            <div className="space-y-4">
              <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="font-medium text-gray-900">Analyse de cash-flow</div>
                <div className="text-sm text-gray-500">Prévisions de trésorerie sur 12 mois</div>
              </button>
              <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="font-medium text-gray-900">Comparaison de performance</div>
                <div className="text-sm text-gray-500">Benchmarking par propriété</div>
              </button>
              <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="font-medium text-gray-900">Analyse fiscale</div>
                <div className="text-sm text-gray-500">Optimisation des déductions</div>
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h4 className="font-medium text-gray-900 mb-2">Rapports avancés</h4>
              <p className="text-gray-500 mb-4">
                Accédez à des analyses approfondies avec le plan Business
              </p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Mettre à niveau
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsTab;
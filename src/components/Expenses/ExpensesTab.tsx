import React, { useState } from 'react';
import { Plus, Receipt, Edit, Trash2, Download, Filter, Calendar, DollarSign, AlertTriangle, ExternalLink } from 'lucide-react';
import { useExpenses } from '../../hooks/useExpenses';
import { useIssues } from '../../hooks/useIssues';
import { useProperties } from '../../hooks/useProperties';
import { useUnits } from '../../hooks/useUnits';
import { useTranslation } from '../../hooks/useTranslation';
import ExpenseForm from './ExpenseForm';

interface ExpensesTabProps {
  onTabChange?: (tab: string) => void;
}

const ExpensesTab: React.FC<ExpensesTabProps> = ({ onTabChange }) => {
  const { formatCurrency } = useTranslation();
  const { expenses, loading, deleteExpense } = useExpenses();
  const { issues } = useIssues();
  const { properties } = useProperties();
  const { units } = useUnits();
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(undefined);
  const [linkedIssue, setLinkedIssue] = useState<any>(undefined);
  const [filters, setFilters] = useState({
    type: 'all',
    property_id: 'all',
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });

  const handleEdit = (expense: any) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleDelete = async (expenseId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) {
      try {
        await deleteExpense(expenseId);
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Erreur lors de la suppression de la dépense');
      }
    }
  };

  const getPropertyName = (propertyId?: string) => {
    if (!propertyId) return 'Général';
    const property = properties.find(p => p.id === propertyId);
    return property ? property.name : 'Propriété supprimée';
  };

  const getUnitName = (unitId?: string) => {
    if (!unitId) return '';
    const unit = units.find(u => u.id === unitId);
    return unit ? ` - ${unit.name}` : '';
  };

  const getIssueName = (issueId?: string) => {
    if (!issueId) return '';
    const issue = issues.find(i => i.id === issueId);
    return issue ? issue.title : 'Problème supprimé';
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      maintenance: 'Maintenance',
      renovation: 'Rénovation',
      utilities: 'Services publics',
      insurance: 'Assurance',
      taxes: 'Taxes',
      other: 'Autre',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      maintenance: 'bg-blue-100 text-blue-800',
      renovation: 'bg-purple-100 text-purple-800',
      utilities: 'bg-green-100 text-green-800',
      insurance: 'bg-orange-100 text-orange-800',
      taxes: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    const matchesType = filters.type === 'all' || expense.type === filters.type;
    const matchesProperty = filters.property_id === 'all' || expense.property_id === filters.property_id;
    const matchesMonth = expenseDate.getMonth() === filters.month;
    const matchesYear = expenseDate.getFullYear() === filters.year;
    
    return matchesType && matchesProperty && matchesMonth && matchesYear;
  });

  const stats = {
    total: filteredExpenses.length,
    totalAmount: filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    byType: expenses.reduce((acc, expense) => {
      acc[expense.type] = (acc[expense.type] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>),
  };

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleAddExpenseFromIssue = (issue: any) => {
    if (issue.status === 'resolved') {
      alert('Impossible d\'ajouter une dépense à un problème déjà résolu.');
      return;
    }
    
    setLinkedIssue(issue);
    setEditingExpense(undefined);
    setShowForm(true);
  };

  const pendingIssues = issues.filter(i => (i.status === 'pending' || i.status === 'in_progress'));

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dépenses</h1>
          <p className="text-gray-600">Suivez et gérez vos dépenses immobilières</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <Download className="w-5 h-5 mr-2" />
            Exporter
          </button>
          <button
            onClick={() => {
              setEditingExpense(undefined);
              setLinkedIssue(undefined);
              setShowForm(true);
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Ajouter une dépense
          </button>
        </div>
      </div>

      {/* Pending Issues Section */}
      {pendingIssues.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-orange-900 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Problèmes en attente de résolution ({pendingIssues.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingIssues.map((issue) => {
              const property = properties.find(p => p.id === issue.property_id);
              const unit = units.find(u => u.id === issue.unit_id);
              const hasLinkedExpense = expenses.some(e => e.issue_id === issue.id);
              
              return (
                <div key={issue.id} className="bg-white border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{issue.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      issue.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      issue.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {issue.priority === 'urgent' ? 'Urgent' :
                       issue.priority === 'high' ? 'Élevée' : 
                       issue.priority === 'medium' ? 'Moyenne' : 'Faible'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{issue.description}</p>
                  <p className="text-xs text-gray-500 mb-3">
                    📍 {property?.name}{unit ? ` - ${unit.name}` : ''}
                  </p>
                  <div className="flex items-center justify-between">
                    {hasLinkedExpense ? (
                      <span className="text-xs text-green-600 font-medium">✓ Dépense associée</span>
                    ) : (
                      <button
                        onClick={() => handleAddExpenseFromIssue(issue)}
                        className="text-xs px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                      >
                        Créer dépense
                      </button>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      issue.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {issue.status === 'pending' ? 'En attente' : 'En cours'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total dépenses</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Montant total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Maintenance</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.byType.maintenance || 0)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rénovation</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.byType.renovation || 0)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les types</option>
              <option value="maintenance">Maintenance</option>
              <option value="renovation">Rénovation</option>
              <option value="utilities">Services publics</option>
              <option value="insurance">Assurance</option>
              <option value="taxes">Taxes</option>
              <option value="other">Autre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Propriété</label>
            <select
              value={filters.property_id}
              onChange={(e) => setFilters(prev => ({ ...prev, property_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Toutes les propriétés</option>
              {properties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
            <select
              value={filters.month}
              onChange={(e) => setFilters(prev => ({ ...prev, month: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {months.map((month, index) => (
                <option key={index} value={index}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
            <select
              value={filters.year}
              onChange={(e) => setFilters(prev => ({ ...prev, year: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Propriété
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune dépense</h3>
                    <p className="text-gray-500 mb-4">Commencez par ajouter votre première dépense</p>
                    <button
                      onClick={() => {
                        setEditingExpense(undefined);
                        setLinkedIssue(undefined);
                        setShowForm(true);
                      }}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Ajouter une dépense
                    </button>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-4">
                          <Receipt className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {expense.description}
                          </div>
                          {expense.issue_id && (
                            <div className="text-xs text-blue-600 flex items-center mt-1">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              <button
                                onClick={() => onTabChange && onTabChange('issues')}
                                className="hover:underline"
                              >
                                Lié au problème: {getIssueName(expense.issue_id)}
                              </button>
                            </div>
                          )}
                          {expense.receipt_url && (
                            <div className="text-xs text-blue-600">
                              Justificatif disponible
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(expense.type)}`}>
                        {getTypeLabel(expense.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getPropertyName(expense.property_id)}{getUnitName(expense.unit_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(expense.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(expense.date).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {expense.receipt_url && (
                          <button
                            onClick={() => window.open(expense.receipt_url, '_blank')}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <ExpenseForm
          expense={editingExpense}
          linkedIssue={linkedIssue}
          onClose={() => {
            setShowForm(false);
            setEditingExpense(undefined);
            setLinkedIssue(undefined);
          }}
        />
      )}
    </div>
  );
};

export default ExpensesTab;
import React, { useState } from 'react';
import { Calendar, Home, Eye, FileText, DollarSign, AlertTriangle, Clock, CheckCircle, XCircle, MapPin, Filter } from 'lucide-react';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { useProperties } from '../../hooks/useProperties';
import { useUnits } from '../../hooks/useUnits';
import { useAuth } from '../../contexts/AuthContext';

interface TenantHistory {
  id: string;
  tenant_id: string;
  type: 'visit_request' | 'property_request' | 'lease_signed' | 'lease_ended' | 'payment' | 'issue_reported' | 'issue_resolved' | 'move_in' | 'move_out';
  title: string;
  description: string;
  property_id?: string;
  unit_id?: string;
  related_id?: string;
  metadata?: any;
  created_at: string;
}

const TenantHistoryTab: React.FC = () => {
  const { user }  = useAuth();
  const { data: history, loading } = useSupabaseData<TenantHistory>('tenant_history', 
    user ? { tenant_id: user.id } : undefined
  );
  const { properties } = useProperties();
  const { units } = useUnits();
  const [filter, setFilter] = useState<TenantHistory['type'] | 'all'>('all');

  const getPropertyInfo = (propertyId?: string, unitId?: string) => {
    const property = propertyId ? properties.find(p => p.id === propertyId) : null;
    const unit = unitId ? units.find(u => u.id === unitId) : null;
    return { property, unit };
  };

  const getTypeIcon = (type: TenantHistory['type']) => {
    switch (type) {
      case 'visit_request':
        return <Eye className="w-5 h-5" />;
      case 'property_request':
        return <Home className="w-5 h-5" />;
      case 'lease_signed':
        return <FileText className="w-5 h-5" />;
      case 'lease_ended':
        return <XCircle className="w-5 h-5" />;
      case 'payment':
        return <DollarSign className="w-5 h-5" />;
      case 'issue_reported':
        return <AlertTriangle className="w-5 h-5" />;
      case 'issue_resolved':
        return <CheckCircle className="w-5 h-5" />;
      case 'move_in':
        return <Home className="w-5 h-5" />;
      case 'move_out':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: TenantHistory['type']) => {
    switch (type) {
      case 'visit_request':
        return 'bg-blue-100 text-blue-800';
      case 'property_request':
        return 'bg-purple-100 text-purple-800';
      case 'lease_signed':
        return 'bg-green-100 text-green-800';
      case 'lease_ended':
        return 'bg-red-100 text-red-800';
      case 'payment':
        return 'bg-emerald-100 text-emerald-800';
      case 'issue_reported':
        return 'bg-orange-100 text-orange-800';
      case 'issue_resolved':
        return 'bg-green-100 text-green-800';
      case 'move_in':
        return 'bg-indigo-100 text-indigo-800';
      case 'move_out':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: TenantHistory['type']) => {
    switch (type) {
      case 'visit_request':
        return 'Demande de visite';
      case 'property_request':
        return 'Demande de logement';
      case 'lease_signed':
        return 'Bail signé';
      case 'lease_ended':
        return 'Fin de bail';
      case 'payment':
        return 'Paiement';
      case 'issue_reported':
        return 'Problème signalé';
      case 'issue_resolved':
        return 'Problème résolu';
      case 'move_in':
        return 'Emménagement';
      case 'move_out':
        return 'Déménagement';
      default:
        return 'Activité';
    }
  };

  const filteredHistory = filter === 'all' ? history : history.filter(h => h.type === filter);

  const stats = {
    totalActivities: history.length,
    visitRequests: history.filter(h => h.type === 'visit_request').length,
    propertyRequests: history.filter(h => h.type === 'property_request').length,
    leaseSigned: history.filter(h => h.type === 'lease_signed').length,
    payments: history.filter(h => h.type === 'payment').length,
    issuesReported: history.filter(h => h.type === 'issue_reported').length,
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mon historique</h1>
        <p className="text-gray-600">Toutes vos activités et interactions passées</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total activités</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalActivities}</p>
            </div>
            <Calendar className="w-6 h-6 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Visites</p>
              <p className="text-xl font-bold text-blue-600">{stats.visitRequests}</p>
            </div>
            <Eye className="w-6 h-6 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Demandes</p>
              <p className="text-xl font-bold text-purple-600">{stats.propertyRequests}</p>
            </div>
            <Home className="w-6 h-6 text-purple-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Baux signés</p>
              <p className="text-xl font-bold text-green-600">{stats.leaseSigned}</p>
            </div>
            <FileText className="w-6 h-6 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Paiements</p>
              <p className="text-xl font-bold text-emerald-600">{stats.payments}</p>
            </div>
            <DollarSign className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Problèmes</p>
              <p className="text-xl font-bold text-orange-600">{stats.issuesReported}</p>
            </div>
            <AlertTriangle className="w-6 h-6 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex flex-wrap gap-2">
            {(['all', 'visit_request', 'property_request', 'lease_signed', 'payment', 'issue_reported'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filter === type
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type === 'all' ? 'Toutes' : getTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Chronologie des activités</h3>
        </div>
        
        <div className="p-6">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune activité</h3>
              <p className="text-gray-500">
                {filter === 'all' ? 'Votre historique apparaîtra ici au fur et à mesure de vos activités' : `Aucune activité de type "${getTypeLabel(filter)}"`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((entry) => {
                const { property, unit } = getPropertyInfo(entry.property_id, entry.unit_id);
                
                return (
                  <div key={entry.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getTypeColor(entry.type)}`}>
                      {getTypeIcon(entry.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold text-gray-900">{entry.title}</h4>
                        <span className="text-xs text-gray-500">
                          {new Date(entry.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{entry.description}</p>
                      
                      {property && (
                        <div className="flex items-center text-xs text-gray-500">
                          <MapPin className="w-3 h-3 mr-1" />
                          <span>
                            {property.name}
                            {unit && ` - ${unit.name}`}
                            {' • '}
                            {property.address?.street}, {property.address?.city}
                          </span>
                        </div>
                      )}
                      
                      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          {entry.metadata.amount && (
                            <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full mr-2">
                              {entry.metadata.amount}$ CAD
                            </span>
                          )}
                          {entry.metadata.status && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full mr-2 ${
                              entry.metadata.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              entry.metadata.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {entry.metadata.status === 'accepted' ? 'Accepté' :
                               entry.metadata.status === 'rejected' ? 'Refusé' : 'En attente'}
                            </span>
                          )}
                          {entry.metadata.priority && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full ${
                              entry.metadata.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                              entry.metadata.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              Priorité {entry.metadata.priority === 'urgent' ? 'urgente' : 
                                      entry.metadata.priority === 'high' ? 'élevée' : 'normale'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantHistoryTab;
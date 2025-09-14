import React from 'react';
import { Home, Calendar, DollarSign, User, Phone, AlertTriangle, FileText, Plus } from 'lucide-react';
import { useTenants } from '../../hooks/useTenants';
import { useProperties } from '../../hooks/useProperties';
import { useUnits } from '../../hooks/useUnits';
import { usePayments } from '../../hooks/usePayments';
import { useIssues } from '../../hooks/useIssues';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import IssueForm from '../Issues/IssueForm';

interface MyRentalTabProps {
  onTabChange?: (tab: string) => void;
}

const MyRentalTab: React.FC<MyRentalTabProps> = ({ onTabChange }) => {
  const { user } = useAuth();
  const { formatCurrency } = useTranslation();
  const { tenants, loading: tenantsLoading } = useTenants();
  const { properties } = useProperties();
  const { units } = useUnits();
  const { payments } = usePayments();
  const { issues } = useIssues();
  const [showIssueForm, setShowIssueForm] = React.useState(false);

  // Find tenant based on current user
  const currentTenant = tenants.find(t => t.user_id === user?.id);
  
  if (tenantsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="space-y-6">
              {[1, 2].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!currentTenant) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun logement</h3>
          <p className="text-gray-500 mb-4">
            Vous n'avez pas encore de logement assigné. Recherchez un logement, programmez une visite, puis faites une demande pour le rejoindre.
          </p>
          <button 
            onClick={() => onTabChange?.('search')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home className="w-5 h-5 mr-2" />
            Rechercher un logement
          </button>
        </div>
      </div>
    );
  }

  const property = properties.find(p => p.id === currentTenant.property_id);
  const unit = units.find(u => u.id === currentTenant.unit_id);
  const tenantPayments = payments.filter(p => p.tenant_id === currentTenant.id);
  const tenantIssues = issues.filter(i => i.tenant_id === currentTenant.id);

  const nextPayment = tenantPayments
    .filter(p => p.status === 'pending')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

  const recentPayments = tenantPayments
    .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
    .slice(0, 5);

  const activeIssues = tenantIssues.filter(i => i.status !== 'resolved');

  const isLeaseExpiringSoon = () => {
    const today = new Date();
    const endDate = new Date(currentTenant.lease_end);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 60 && diffDays > 0;
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mon logement</h1>
        <p className="text-gray-600">Informations sur votre location actuelle</p>
      </div>

      {/* Lease Expiring Warning */}
      {isLeaseExpiringSoon() && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-orange-400 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-orange-800">Bail expirant bientôt</h3>
              <p className="text-sm text-orange-700 mt-1">
                Votre bail expire le {new Date(currentTenant.lease_end).toLocaleDateString('fr-FR')}. 
                Contactez votre propriétaire pour le renouvellement.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Property Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Home className="w-5 h-5 mr-2" />
              Informations du logement
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Adresse</h4>
                <p className="text-gray-600">{property?.name}</p>
                <p className="text-gray-600">{property?.address?.street}, {property?.address?.city}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Détails</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type</span>
                    <span>{property?.type === 'entire' ? 'Logement entier' : 'Colocation'}</span>
                  </div>
                  {unit && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Chambre</span>
                      <span>{unit.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Superficie</span>
                    <span>{unit?.area || property?.total_area} m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Loyer mensuel</span>
                    <span className="font-semibold text-green-600">{formatCurrency(currentTenant.monthly_rent)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lease Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Informations du bail
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Début du bail</span>
                  <p className="font-medium">{new Date(currentTenant.lease_start).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Fin du bail</span>
                  <p className="font-medium">{new Date(currentTenant.lease_end).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Dépôt de garantie</span>
                  <p className="font-medium text-gray-400">Non applicable (Canada)</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Date d'échéance</span>
                  <p className="font-medium">Le {currentTenant.payment_due_date} de chaque mois</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Payments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Historique des paiements
            </h3>
            
            <div className="space-y-3">
              {recentPayments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucun paiement enregistré</p>
              ) : (
                recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium">{formatCurrency(payment.amount)}</p>
                      <p className="text-sm text-gray-500">
                        Échéance: {new Date(payment.due_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                      payment.status === 'late' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {payment.status === 'paid' ? 'Payé' :
                       payment.status === 'late' ? 'En retard' : 'En attente'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Next Payment */}
          {nextPayment && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Prochain paiement
              </h3>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {formatCurrency(nextPayment.amount)}
                </div>
                <div className="text-gray-600 mb-4">
                  Échéance: {new Date(nextPayment.due_date).toLocaleDateString('fr-FR')}
                </div>
                <button 
                  onClick={() => {
                    if (confirm('Confirmer le paiement de ' + formatCurrency(nextPayment.amount) + ' ?')) {
                      // Redirect to payments tab where the payment can be processed
                      onTabChange?.('payments');
                    }
                  }}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Aller aux paiements
                </button>
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          {currentTenant.emergency_contact?.name && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Contact d'urgence
              </h3>
              
              <div className="space-y-2">
                <p className="font-medium">{currentTenant.emergency_contact.name}</p>
                <p className="text-sm text-gray-600">{currentTenant.emergency_contact.relationship}</p>
                {currentTenant.emergency_contact.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {currentTenant.emergency_contact.phone}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Issues */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Problèmes en cours
            </h3>
            
            {activeIssues.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucun problème signalé</p>
            ) : (
              <div className="space-y-3">
                {activeIssues.map((issue) => (
                  <div key={issue.id} className="p-3 border border-gray-200 rounded-lg">
                    <p className="font-medium text-sm">{issue.title}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        issue.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        issue.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {issue.priority === 'urgent' ? 'Urgent' :
                         issue.priority === 'high' ? 'Élevée' : 'Normale'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        issue.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {issue.status === 'pending' ? 'En attente' : 'En cours'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
            
            <div className="space-y-3">
              <button 
                onClick={() => setShowIssueForm(true)}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Signaler un problème</div>
                <div className="text-sm text-gray-500">Maintenance, réparations...</div>
              </button>
              <button 
                onClick={() => alert('Fonctionnalité de contact à venir...')}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Contacter le propriétaire</div>
                <div className="text-sm text-gray-500">Questions, demandes...</div>
              </button>
              <button 
                onClick={() => alert('Téléchargement du bail en cours...')}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Télécharger le bail</div>
                <div className="text-sm text-gray-500">Document PDF</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showIssueForm && (
        <IssueForm
          isOwner={false}
          onClose={() => setShowIssueForm(false)}
        />
      )}
    </div>
  );
};

export default MyRentalTab;
import React, { useState } from 'react';
import { Send, MessageSquare, Mail, Smartphone, Clock } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useTenants } from '../../hooks/useTenants';
import { aiService } from '../../services/aiService';

interface PaymentReminderButtonProps {
  payment: any;
  className?: string;
}

const PaymentReminderButton: React.FC<PaymentReminderButtonProps> = ({ payment, className = '' }) => {
  const { addNotification } = useNotifications();
  const { tenants } = useTenants();
  const [showModal, setShowModal] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const tenant = tenants.find(t => t.id === payment.tenant_id);

  const handleSendReminder = async () => {
    setIsLoading(true);
    try {
      // Créer une notification pour le locataire
      await addNotification({
        user_id: tenant?.user_id || '',
        type: 'payment_reminder',
        title: 'Rappel de paiement',
        message: customMessage || `Votre loyer de ${payment.amount}$ est dû le ${new Date(payment.due_date).toLocaleDateString('fr-FR')}`,
        read: false,
        data: {
          payment_id: payment.id,
          amount: payment.amount,
          due_date: payment.due_date
        }
      });

      alert('✅ Rappel envoyé avec succès !');
      setShowModal(false);
      setCustomMessage('');
    } catch (error) {
      alert('❌ Erreur lors de l\'envoi du rappel');
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysUntilDue = () => {
    const today = new Date();
    const dueDate = new Date(payment.due_date);
    return Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getUrgencyColor = () => {
    const days = getDaysUntilDue();
    if (days < 0) return 'text-red-600';
    if (days === 0) return 'text-orange-600';
    if (days <= 2) return 'text-yellow-600';
    return 'text-blue-600';
  };

  if (payment.status === 'paid') return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium transition-colors ${getUrgencyColor()} hover:bg-gray-100 ${className}`}
        title="Envoyer un rappel de paiement"
      >
        <Send className="w-4 h-4 mr-1" />
        Rappel
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Envoyer un rappel de paiement</h3>
              <p className="text-sm text-gray-600">
                Pour {payment.amount}$ CAD
              </p>
            </div>

            {/* Informations du paiement */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">Échéance</span>
                <span className="text-sm text-blue-800">
                  {new Date(payment.due_date).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">Jours restants</span>
                <span className={`text-sm font-bold ${getUrgencyColor()}`}>
                  {getDaysUntilDue() === 0 ? 'Aujourd\'hui' : 
                   getDaysUntilDue() < 0 ? `${Math.abs(getDaysUntilDue())} jour(s) de retard` :
                   `${getDaysUntilDue()} jour(s)`}
                </span>
              </div>
            </div>

            {/* Message personnalisé */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message personnalisé
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Message de rappel personnalisé..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                Annuler
              </button>
              <button
                onClick={handleSendReminder}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer le rappel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PaymentReminderButton;
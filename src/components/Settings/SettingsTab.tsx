import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Shield, Bell, Globe, Palette, Save, Trash2, AlertTriangle, Moon, Sun, Monitor } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: 'owner' | 'tenant';
  avatar_url: string | null;
  address: any;
  preferences: any;
}

const SettingsTab: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  // Appliquer le thème au chargement
  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    setCurrentTheme(savedTheme as 'light' | 'dark');
    applyTheme(savedTheme as 'light' | 'dark');
  }, []);

  const applyTheme = (theme: 'light' | 'dark') => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  };

  const toggleTheme = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(newTheme);
    applyTheme(newTheme);
    
    // Mettre à jour les préférences utilisateur
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        theme: newTheme
      }
    }));
  };

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: {
      street: '',
      city: '',
      postal_code: '',
      country: ''
    },
    preferences: {
      notifications: {
        email: true,
        push: true,
        sms: false
      },
      language: 'fr',
      theme: 'light',
      aiCommunication: 'email' as 'email' | 'sms'
    }
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
        address: data.address || {
          street: '',
          city: '',
          postal_code: '',
          country: ''
        },
        preferences: {
          ...data.preferences,
          aiCommunication: data.preferences?.aiCommunication || 'email'
        } || {
          notifications: {
            email: true,
            push: true,
            sms: false
          },
          language: 'fr',
          theme: 'light',
          aiCommunication: 'email'
        }
      });
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement du profil' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          address: formData.address,
          preferences: formData.preferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profil mis à jour avec succès' });
      fetchProfile();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour du profil' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
  };

  const handlePreferenceChange = (category: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [category]: typeof prev.preferences[category] === 'object' ? {
          ...prev.preferences[category],
          [field]: value
        } : value
      }
    }));
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'SUPPRIMER') {
      alert('Veuillez taper "SUPPRIMER" pour confirmer');
      return;
    }

    if (!confirm('ATTENTION: Cette action est irréversible. Toutes vos données seront définitivement supprimées. Continuer ?')) {
      return;
    }

    try {
      setSaving(true);
      
      // Appeler la fonction de suppression de compte
      const { error } = await supabase.rpc('delete_user_account', {
        user_id_to_delete: user?.id
      });

      if (error) throw error;

      alert('Votre compte a été supprimé avec succès.');
      // L'utilisateur sera automatiquement déconnecté
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression du compte');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Paramètres du Profil
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Gérez vos informations personnelles et préférences
          </p>
        </div>

        {message && (
          <div className={`mx-6 mt-4 p-3 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informations personnelles */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="w-4 h-4 mr-2" />
              Informations personnelles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Phone className="w-4 h-4 mr-1" />
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Adresse
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rue
                </label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ville
                </label>
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code postal
                </label>
                <input
                  type="text"
                  value={formData.address.postal_code}
                  onChange={(e) => handleAddressChange('postal_code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Préférences */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.preferences.notifications.email}
                  onChange={(e) => handlePreferenceChange('notifications', 'email', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Notifications par email</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.preferences.notifications.push}
                  onChange={(e) => handlePreferenceChange('notifications', 'push', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Notifications push</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.preferences.notifications.sms}
                  onChange={(e) => handlePreferenceChange('notifications', 'sms', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Notifications SMS</span>
              </label>
            </div>
          </div>

          {/* Communication IA */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Préférence de communication IA
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                formData.preferences.aiCommunication === 'email'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="aiCommunication"
                  value="email"
                  checked={formData.preferences.aiCommunication === 'email'}
                  onChange={(e) => handlePreferenceChange('', 'aiCommunication', e.target.value)}
                  className="sr-only"
                />
                <Mail className="w-5 h-5 mr-2 text-blue-600" />
                <span className="text-sm font-medium">Email</span>
              </label>
              <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                formData.preferences.aiCommunication === 'sms'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="aiCommunication"
                  value="sms"
                  checked={formData.preferences.aiCommunication === 'sms'}
                  onChange={(e) => handlePreferenceChange('', 'aiCommunication', e.target.value)}
                  className="sr-only"
                />
                <Phone className="w-5 h-5 mr-2 text-green-600" />
                <span className="text-sm font-medium">SMS</span>
              </label>
            </div>
          </div>

          {/* Langue et thème */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Globe className="w-4 h-4 mr-2" />
                Langue
              </h3>
              <select
                value={formData.preferences.language}
                onChange={(e) => handlePreferenceChange('', 'language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Palette className="w-4 h-4 mr-2" />
                Thème
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (currentTheme !== 'light') {
                      setCurrentTheme('light');
                      applyTheme('light');
                      setFormData(prev => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          theme: 'light'
                        }
                      }));
                    }
                  }}
                  className={`flex items-center px-4 py-2 rounded-lg border-2 transition-all ${
                    currentTheme === 'light' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <Sun className="w-4 h-4 mr-2" />
                  Clair
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (currentTheme !== 'dark') {
                      setCurrentTheme('dark');
                      applyTheme('dark');
                      setFormData(prev => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          theme: 'dark'
                        }
                      }));
                    }
                  }}
                  className={`flex items-center px-4 py-2 rounded-lg border-2 transition-all ${
                    currentTheme === 'dark' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <Moon className="w-4 h-4 mr-2" />
                  Sombre
                </button>
              </div>
            </div>
          </div>

          {/* Rôle (lecture seule) */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              Rôle
            </h3>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                profile?.role === 'owner' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {profile?.role === 'owner' ? 'Propriétaire' : 'Locataire'}
              </span>
            </div>
          </div>

          {/* Zone de danger - Suppression de compte */}
          <div className="border-t border-red-200 pt-6">
            <h3 className="text-lg font-medium text-red-900 mb-4 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Zone de danger
            </h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">Supprimer mon compte</h4>
              <p className="text-sm text-red-800 mb-4">
                Cette action supprimera définitivement votre compte et toutes vos données. 
                Cette action est irréversible.
              </p>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer mon compte
              </button>
            </div>
          </div>

          {/* Bouton de sauvegarde */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-red-900 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Supprimer définitivement le compte
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                Cette action supprimera définitivement :
              </p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>• Votre profil utilisateur</li>
                <li>• Toutes vos propriétés</li>
                <li>• Tous vos locataires</li>
                <li>• Tous les paiements et dépenses</li>
                <li>• Tous les problèmes signalés</li>
                <li>• Votre historique complet</li>
              </ul>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pour confirmer, tapez <strong>SUPPRIMER</strong> ci-dessous :
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Tapez SUPPRIMER"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={saving}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={saving || deleteConfirmation !== 'SUPPRIMER'}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsTab;
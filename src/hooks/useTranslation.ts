import { useAuth } from '../contexts/AuthContext';

interface Translations {
  [key: string]: {
    fr: string;
    en: string;
  };
}

const translations: Translations = {
  // Navigation
  'nav.dashboard': { fr: 'Tableau de bord', en: 'Dashboard' },
  'nav.properties': { fr: 'Propriétés', en: 'Properties' },
  'nav.tenants': { fr: 'Locataires', en: 'Tenants' },
  'nav.payments': { fr: 'Paiements', en: 'Payments' },
  'nav.expenses': { fr: 'Dépenses', en: 'Expenses' },
  'nav.issues': { fr: 'Problèmes', en: 'Issues' },
  'nav.reports': { fr: 'Rapports', en: 'Reports' },
  'nav.aiAgents': { fr: 'Agents IA', en: 'AI Agents' },
  'nav.subscription': { fr: 'Abonnement', en: 'Subscription' },
  'nav.settings': { fr: 'Paramètres', en: 'Settings' },
  'nav.search': { fr: 'Recherche', en: 'Search' },
  'nav.myRental': { fr: 'Mon logement', en: 'My Rental' },

  // Common
  'common.add': { fr: 'Ajouter', en: 'Add' },
  'common.edit': { fr: 'Modifier', en: 'Edit' },
  'common.delete': { fr: 'Supprimer', en: 'Delete' },
  'common.save': { fr: 'Sauvegarder', en: 'Save' },
  'common.cancel': { fr: 'Annuler', en: 'Cancel' },
  'common.confirm': { fr: 'Confirmer', en: 'Confirm' },
  'common.loading': { fr: 'Chargement...', en: 'Loading...' },
  'common.search': { fr: 'Rechercher', en: 'Search' },
  'common.filter': { fr: 'Filtrer', en: 'Filter' },
  'common.export': { fr: 'Exporter', en: 'Export' },
  'common.download': { fr: 'Télécharger', en: 'Download' },
  'common.upload': { fr: 'Télécharger', en: 'Upload' },
  'common.close': { fr: 'Fermer', en: 'Close' },
  'common.back': { fr: 'Retour', en: 'Back' },
  'common.next': { fr: 'Suivant', en: 'Next' },
  'common.previous': { fr: 'Précédent', en: 'Previous' },
  'common.yes': { fr: 'Oui', en: 'Yes' },
  'common.no': { fr: 'Non', en: 'No' },

  // Currency
  'currency.CAD': { fr: 'Dollar canadien', en: 'Canadian Dollar' },
  'currency.USD': { fr: 'Dollar américain', en: 'US Dollar' },
  'currency.EUR': { fr: 'Euro', en: 'Euro' },

  // Property types
  'property.entire': { fr: 'Logement entier', en: 'Entire Property' },
  'property.shared': { fr: 'Colocation', en: 'Shared Housing' },

  // Status
  'status.available': { fr: 'Disponible', en: 'Available' },
  'status.occupied': { fr: 'Occupé', en: 'Occupied' },
  'status.pending': { fr: 'En attente', en: 'Pending' },
  'status.active': { fr: 'Actif', en: 'Active' },
  'status.inactive': { fr: 'Inactif', en: 'Inactive' },
  'status.resolved': { fr: 'Résolu', en: 'Resolved' },
  'status.inProgress': { fr: 'En cours', en: 'In Progress' },

  // Payment status
  'payment.paid': { fr: 'Payé', en: 'Paid' },
  'payment.late': { fr: 'En retard', en: 'Late' },
  'payment.overdue': { fr: 'Impayé', en: 'Overdue' },

  // Priority levels
  'priority.low': { fr: 'Faible', en: 'Low' },
  'priority.medium': { fr: 'Moyenne', en: 'Medium' },
  'priority.high': { fr: 'Élevée', en: 'High' },
  'priority.urgent': { fr: 'Urgente', en: 'Urgent' },

  // Settings
  'settings.profile': { fr: 'Profil utilisateur', en: 'User Profile' },
  'settings.preferences': { fr: 'Préférences', en: 'Preferences' },
  'settings.security': { fr: 'Sécurité', en: 'Security' },
  'settings.language': { fr: 'Langue', en: 'Language' },
  'settings.currency': { fr: 'Devise', en: 'Currency' },
  'settings.theme': { fr: 'Thème', en: 'Theme' },
  'settings.notifications': { fr: 'Notifications', en: 'Notifications' },
  'settings.address': { fr: 'Adresse', en: 'Address' },

  // Form fields
  'form.firstName': { fr: 'Prénom', en: 'First Name' },
  'form.lastName': { fr: 'Nom', en: 'Last Name' },
  'form.email': { fr: 'Email', en: 'Email' },
  'form.phone': { fr: 'Téléphone', en: 'Phone' },
  'form.address': { fr: 'Adresse', en: 'Address' },
  'form.street': { fr: 'Rue', en: 'Street' },
  'form.city': { fr: 'Ville', en: 'City' },
  'form.province': { fr: 'Province', en: 'Province/State' },
  'form.postalCode': { fr: 'Code postal', en: 'Postal Code' },
  'form.country': { fr: 'Pays', en: 'Country' },
  'form.rent': { fr: 'Loyer', en: 'Rent' },
  'form.amount': { fr: 'Montant', en: 'Amount' },
  'form.description': { fr: 'Description', en: 'Description' },
  'form.date': { fr: 'Date', en: 'Date' },

  // Dashboard
  'dashboard.welcome': { fr: 'Bonjour', en: 'Hello' },
  'dashboard.overview': { fr: 'Vue d\'ensemble de votre portefeuille immobilier', en: 'Overview of your real estate portfolio' },
  'dashboard.totalProperties': { fr: 'Propriétés', en: 'Properties' },
  'dashboard.totalTenants': { fr: 'Locataires', en: 'Tenants' },
  'dashboard.monthlyRevenue': { fr: 'Revenus mensuels', en: 'Monthly Revenue' },
  'dashboard.occupancyRate': { fr: 'Taux d\'occupation', en: 'Occupancy Rate' },

  // Subscription plans
  'plan.free': { fr: 'Gratuit', en: 'Free' },
  'plan.pro': { fr: 'Pro', en: 'Pro' },
  'plan.business': { fr: 'Business', en: 'Business' },
  'plan.current': { fr: 'Plan actuel', en: 'Current Plan' },
  'plan.popular': { fr: 'Populaire', en: 'Popular' },
  'plan.upgrade': { fr: 'Mettre à niveau', en: 'Upgrade' },
};

export function useTranslation() {
  const { user } = useAuth();
  
  const language = user?.preferences?.language || 'fr';

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation[language] || translation.fr || key;
  };

  const formatCurrency = (amount: number): string => {
    const currency = 'CAD';
    const locale = language === 'fr' ? 'fr-CA' : 'en-CA';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getCurrencySymbol = (): string => {
    return '$';
  };

  return { t, formatCurrency, getCurrencySymbol, language };
}
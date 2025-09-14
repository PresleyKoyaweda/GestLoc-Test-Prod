import React, { useState } from 'react';
import { Bell, User, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';

interface HeaderProps {
  onMenuClick: () => void;
  user: any;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, user }) => {
  const { logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.profile-dropdown') && !target.closest('.notifications-dropdown')) {
        setShowProfile(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        console.warn('Erreur marquage notification:', error);
      }
    }
    setShowNotifications(false);
    
    // Navigation contextuelle basée sur le type de notification
    if (notification.data?.property_id) {
      // Rediriger vers l'onglet approprié selon le type
      if (notification.type === 'payment_reminder') {
        // Redirection vers les paiements sera gérée par le parent
      }
    }
  };
  
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-4 lg:ml-0">
            <h2 className="text-xl font-semibold text-gray-900">
              Bonjour, {user?.first_name || user?.firstName || 'Utilisateur'}
            </h2>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative notifications-dropdown">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
            <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <p className="text-sm text-gray-500">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">Aucune notification</p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className={`text-sm font-medium ${!notification.read ? 'text-blue-900' : 'text-gray-900'}`}>
                              {notification.title}
                            </h4>
                            <p className={`text-sm mt-1 ${!notification.read ? 'text-blue-800' : 'text-gray-600'}`}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Profile */}
          <div className="relative profile-dropdown">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium hidden sm:block">
                {user?.first_name || user?.firstName || 'Utilisateur'}
              </span>
            </button>
            
            {showProfile && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <p className="font-medium">
                    {user?.first_name || user?.firstName} {user?.last_name || user?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {user?.role === 'owner' ? 'Propriétaire' : 'Locataire'}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
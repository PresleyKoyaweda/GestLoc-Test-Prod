import { useSupabaseData } from './useSupabaseData';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
  id: string;
  user_id: string;
  type: 'payment_reminder' | 'payment_overdue' | 'issue_reported' | 'issue_resolved' | 'general';
  title: string;
  message: string;
  read: boolean;
  data: any;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  
  const {
    data: notifications,
    loading,
    error,
    insert,
    update,
    remove,
    refetch
  } = useSupabaseData<Notification>('notifications', 
    user ? { user_id: user.id } : undefined
  );

  const addNotification = async (notificationData: Omit<Notification, 'id' | 'created_at'>) => {
    const newNotification = {
      ...notificationData,
      created_at: new Date().toISOString()
    };
    
    return await insert(newNotification);
  };

  const markAsRead = async (notificationId: string) => {
    return await update(notificationId, { read: true });
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    await Promise.all(
      unreadNotifications.map(n => markAsRead(n.id))
    );
  };

  const deleteNotification = async (notificationId: string) => {
    return await remove(notificationId);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    loading,
    error,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    unreadCount,
    refetch
  };
}
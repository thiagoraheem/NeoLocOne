import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./use-auth";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (user?.id) {
      const stored = localStorage.getItem(`notifications_${user.id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setNotifications(parsed.map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp)
          })));
        } catch (error) {
          console.error('Failed to load notifications:', error);
        }
      }
    }
  }, [user?.id]);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (user?.id && notifications.length > 0) {
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(notifications));
    }
  }, [notifications, user?.id]);

  // Add some sample notifications for demo purposes
  useEffect(() => {
    if (user?.id && notifications.length === 0) {
      const sampleNotifications: Notification[] = [
        {
          id: 'welcome',
          title: 'Welcome to NeoLoc One!',
          message: 'Your account has been set up successfully. Explore the available modules.',
          type: 'success',
          timestamp: new Date(),
          read: false,
        },
        {
          id: 'system_update',
          title: 'System Update Available',
          message: 'A new system update is available with enhanced security features.',
          type: 'info',
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          read: false,
          actionUrl: '/admin/modules',
          actionLabel: 'View Updates'
        },
        {
          id: 'module_health',
          title: 'Module Health Check',
          message: 'All system modules are running normally. No issues detected.',
          type: 'success',
          timestamp: new Date(Date.now() - 7200000), // 2 hours ago
          read: true,
        }
      ];
      setNotifications(sampleNotifications);
    }
  }, [user?.id, notifications.length]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep only latest 50
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
    if (user?.id) {
      localStorage.removeItem(`notifications_${user.id}`);
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
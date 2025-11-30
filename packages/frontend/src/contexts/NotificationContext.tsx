import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import api from '../lib/api';

interface NotificationContextType {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<NotificationPermission>;
  sendTestNotification: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * Convert base64 VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [error, setError] = useState<string | null>(null);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  // Fetch VAPID public key
  useEffect(() => {
    const fetchVapidKey = async () => {
      try {
        const response = await api.get('/notifications/vapid-public-key');
        if (response.data?.success && response.data?.data?.publicKey) {
          setVapidPublicKey(response.data.data.publicKey);
        }
      } catch (err) {
        console.log('Push notifications not available on server');
      }
    };

    if (isSupported) {
      fetchVapidKey();
    }
  }, [isSupported]);

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported || !isAuthenticated) {
        setIsLoading(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error('Error checking subscription:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [isSupported, isAuthenticated]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (err) {
      console.error('Error requesting permission:', err);
      return 'denied';
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !vapidPublicKey || !isAuthenticated) {
      setError('Push notifications not available');
      return false;
    }

    // Check user preference
    if (!user?.preferences?.notifications?.pushNotifications) {
      setError('Push notifications disabled in preferences');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission if not granted
      if (permission !== 'granted') {
        const newPermission = await requestPermission();
        if (newPermission !== 'granted') {
          setError('Notification permission denied');
          setIsLoading(false);
          return false;
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      });

      // Send subscription to server
      const subscriptionJson = subscription.toJSON();
      await api.post('/notifications/subscribe', {
        endpoint: subscriptionJson.endpoint,
        expirationTime: subscriptionJson.expirationTime,
        keys: subscriptionJson.keys,
      });

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      console.error('Error subscribing:', err);
      setError(err.response?.data?.message || err.message || 'Failed to subscribe');
      setIsLoading(false);
      return false;
    }
  }, [isSupported, vapidPublicKey, isAuthenticated, user, permission, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Notify server
      if (isAuthenticated) {
        await api.post('/notifications/unsubscribe');
      }

      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      console.error('Error unsubscribing:', err);
      setError(err.message || 'Failed to unsubscribe');
      setIsLoading(false);
      return false;
    }
  }, [isSupported, isAuthenticated]);

  // Send test notification (dev only)
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    if (!isSubscribed || !isAuthenticated) {
      return false;
    }

    try {
      await api.post('/notifications/test');
      return true;
    } catch (err) {
      console.error('Error sending test notification:', err);
      return false;
    }
  }, [isSubscribed, isAuthenticated]);

  const value: NotificationContextType = {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    error,
    subscribe,
    unsubscribe,
    requestPermission,
    sendTestNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

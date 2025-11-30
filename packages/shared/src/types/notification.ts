/**
 * Push Notification Types
 */

export interface PushSubscriptionData {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface StoredPushSubscription extends PushSubscriptionData {
  userId: string;
  deviceId: string;
  createdAt: Date;
  userAgent?: string;
}

export type NotificationType = 'recall_alert' | 'safety_alert' | 'test';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  type: NotificationType;
  data?: Record<string, unknown>;
}

export interface NotificationSendResult {
  success: boolean;
  userId: string;
  deviceId?: string;
  error?: string;
}

export interface BulkNotificationResult {
  total: number;
  successful: number;
  failed: number;
  results: NotificationSendResult[];
}

export interface RecallNotificationData {
  recallId: string;
  recallNumber?: string;
  productName: string;
  recallClass: string;
  reason: string;
  manufacturer?: string;
}

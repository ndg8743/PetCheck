/**
 * Push Notification Service
 * Handles web push notifications using VAPID
 */

import webpush, { PushSubscription, SendResult } from 'web-push';
import { config } from '../../config';
import { createLogger } from '../logger';
import { redis } from '../redis';
import {
  PushSubscriptionData,
  StoredPushSubscription,
  NotificationPayload,
  NotificationSendResult,
  BulkNotificationResult,
} from '@petcheck/shared';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('push-service');

// Redis key prefix for push subscriptions
const SUBSCRIPTION_PREFIX = 'push:subscriptions:';

class PushNotificationService {
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize web-push with VAPID keys
   */
  private initialize(): void {
    const { publicKey, privateKey, subject } = config.webPush;

    if (!publicKey || !privateKey) {
      logger.warn('VAPID keys not configured - push notifications disabled');
      return;
    }

    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.isConfigured = true;
      logger.info('Web push service initialized');
    } catch (error) {
      logger.error('Failed to initialize web push:', error);
    }
  }

  /**
   * Check if push notifications are configured
   */
  isEnabled(): boolean {
    return this.isConfigured;
  }

  /**
   * Get VAPID public key for frontend
   */
  getPublicKey(): string | null {
    return this.isConfigured ? config.webPush.publicKey : null;
  }

  /**
   * Subscribe a user's device to push notifications
   */
  async subscribe(
    userId: string,
    subscription: PushSubscriptionData,
    userAgent?: string
  ): Promise<StoredPushSubscription> {
    const deviceId = uuidv4();
    const storedSubscription: StoredPushSubscription = {
      ...subscription,
      userId,
      deviceId,
      createdAt: new Date(),
      userAgent,
    };

    // Store subscription in Redis
    // Use a hash to allow multiple subscriptions per user (different devices)
    const key = `${SUBSCRIPTION_PREFIX}${userId}`;
    await redis.hset(key, deviceId, JSON.stringify(storedSubscription));

    // Set expiry for 30 days (subscriptions can expire)
    await redis.expire(key, 30 * 24 * 60 * 60);

    logger.info(`Push subscription added for user ${userId}, device ${deviceId}`);
    return storedSubscription;
  }

  /**
   * Unsubscribe a user's device
   */
  async unsubscribe(userId: string, deviceId?: string): Promise<number> {
    const key = `${SUBSCRIPTION_PREFIX}${userId}`;

    if (deviceId) {
      // Remove specific device
      const deleted = await redis.hdel(key, deviceId);
      logger.info(`Push subscription removed for user ${userId}, device ${deviceId}`);
      return deleted;
    }

    // Remove all subscriptions for user
    const subscriptions = await redis.hgetall(key);
    const count = Object.keys(subscriptions).length;
    await redis.del(key);
    logger.info(`All push subscriptions removed for user ${userId} (${count} devices)`);
    return count;
  }

  /**
   * Get all subscriptions for a user
   */
  async getUserSubscriptions(userId: string): Promise<StoredPushSubscription[]> {
    const key = `${SUBSCRIPTION_PREFIX}${userId}`;
    const subscriptions = await redis.hgetall(key);

    return Object.values(subscriptions).map((s) => JSON.parse(s));
  }

  /**
   * Send notification to a single user (all their devices)
   */
  async sendToUser(
    userId: string,
    payload: NotificationPayload
  ): Promise<NotificationSendResult[]> {
    if (!this.isConfigured) {
      return [{ success: false, userId, error: 'Push notifications not configured' }];
    }

    const subscriptions = await this.getUserSubscriptions(userId);
    if (subscriptions.length === 0) {
      return [{ success: false, userId, error: 'No subscriptions found' }];
    }

    const results: NotificationSendResult[] = [];

    for (const sub of subscriptions) {
      const result = await this.sendToSubscription(sub, payload);
      results.push(result);
    }

    return results;
  }

  /**
   * Send notification to multiple users
   */
  async sendBulk(
    userIds: string[],
    payload: NotificationPayload
  ): Promise<BulkNotificationResult> {
    const results: NotificationSendResult[] = [];

    for (const userId of userIds) {
      const userResults = await this.sendToUser(userId, payload);
      results.push(...userResults);
    }

    const successful = results.filter((r) => r.success).length;

    return {
      total: results.length,
      successful,
      failed: results.length - successful,
      results,
    };
  }

  /**
   * Send notification to a specific subscription
   */
  private async sendToSubscription(
    subscription: StoredPushSubscription,
    payload: NotificationPayload
  ): Promise<NotificationSendResult> {
    const pushSubscription: PushSubscription = {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    };

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/favicon-32x32.png',
      tag: payload.tag,
      data: {
        url: payload.url || '/',
        type: payload.type,
        ...payload.data,
      },
    });

    try {
      await webpush.sendNotification(pushSubscription, notificationPayload);

      logger.debug(`Notification sent to user ${subscription.userId}, device ${subscription.deviceId}`);

      return {
        success: true,
        userId: subscription.userId,
        deviceId: subscription.deviceId,
      };
    } catch (error: any) {
      logger.error(`Failed to send notification to ${subscription.userId}:`, error.message);

      // Handle expired/invalid subscriptions (410 Gone or 404 Not Found)
      if (error.statusCode === 410 || error.statusCode === 404) {
        logger.info(`Removing expired subscription for user ${subscription.userId}`);
        await this.unsubscribe(subscription.userId, subscription.deviceId);
      }

      return {
        success: false,
        userId: subscription.userId,
        deviceId: subscription.deviceId,
        error: error.message,
      };
    }
  }

  /**
   * Send recall alert notification
   */
  async sendRecallAlert(
    userIds: string[],
    recallData: {
      productName: string;
      recallClass: string;
      reason: string;
      recallId?: string;
    }
  ): Promise<BulkNotificationResult> {
    const payload: NotificationPayload = {
      title: `Drug Recall Alert: ${recallData.productName}`,
      body: `Class ${recallData.recallClass} recall - ${recallData.reason.substring(0, 100)}${recallData.reason.length > 100 ? '...' : ''}`,
      icon: '/pwa-192x192.png',
      tag: `recall-${recallData.recallId || Date.now()}`,
      type: 'recall_alert',
      url: recallData.recallId ? `/recalls/${recallData.recallId}` : '/recalls',
      data: recallData,
    };

    return this.sendBulk(userIds, payload);
  }

  /**
   * Send test notification
   */
  async sendTestNotification(userId: string): Promise<NotificationSendResult[]> {
    const payload: NotificationPayload = {
      title: 'PetCheck Test Notification',
      body: 'Push notifications are working correctly!',
      icon: '/pwa-192x192.png',
      tag: 'test',
      type: 'test',
      url: '/',
    };

    return this.sendToUser(userId, payload);
  }
}

export const pushService = new PushNotificationService();
export default pushService;

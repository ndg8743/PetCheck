import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Alert } from '../components/ui/Alert';
import { LoadingScreen } from '../components/ui/LoadingSpinner';
import { ConfirmDialog } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
  timezone: string;
  createdAt: string;
}

interface NotificationPreferences {
  emailNotifications: boolean;
  recallAlerts: boolean;
  medicationReminders: boolean;
  safetyUpdates: boolean;
  newsletterSubscription: boolean;
}

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}> = ({ checked, onChange, label, description }) => (
  <label className="flex items-start gap-4 cursor-pointer group">
    <div className="relative mt-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div className={`w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform absolute top-1 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </div>
    </div>
    <div className="flex-1">
      <div className="font-medium text-navy-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{label}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{description}</div>
    </div>
  </label>
);

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    permission: pushPermission,
    error: pushError,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush,
    sendTestNotification,
  } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    email: '',
    name: '',
    phoneNumber: '',
    timezone: 'America/New_York',
    createdAt: '',
  });

  const [notifications, setNotifications] = useState<NotificationPreferences>({
    emailNotifications: true,
    recallAlerts: true,
    medicationReminders: true,
    safetyUpdates: true,
    newsletterSubscription: false,
  });

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      if (user) {
        // Load from AuthContext user data
        setProfile({
          id: user.id || '',
          email: user.email || '',
          name: user.name || '',
          phoneNumber: '',
          timezone: 'America/New_York',
          createdAt: user.createdAt ? (typeof user.createdAt === 'string' ? user.createdAt : new Date(user.createdAt).toISOString()) : new Date().toISOString(),
        });

        // Load notification preferences from localStorage
        const savedNotifications = localStorage.getItem('petcheck_notifications');
        if (savedNotifications) {
          setNotifications(JSON.parse(savedNotifications));
        }
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to load profile. Please try again.');
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Update user in context and localStorage
      if (user) {
        const updatedUser = {
          ...user,
          name: profile.name,
        };
        updateUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      setSuccessMessage('Profile updated successfully!');
      setSaving(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      setSaving(false);
    }
  };

  const handleNotificationUpdate = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Save notification preferences to localStorage
      localStorage.setItem('petcheck_notifications', JSON.stringify(notifications));
      setSuccessMessage('Notification preferences updated!');
      setSaving(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update preferences. Please try again.');
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setShowDeleteConfirm(false);
      alert('Account deleted successfully');
      navigate('/');
    } catch (err) {
      alert('Failed to delete account. Please try again or contact support.');
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading profile..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-up">
            <h1 className="text-3xl font-bold text-navy-900 dark:text-white font-display mb-2">Account Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your profile and preferences</p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <Alert variant="success" className="mb-6 animate-fade-in">
              {successMessage}
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="danger" className="mb-6 animate-fade-in">
              {error}
            </Alert>
          )}

          {/* Account Information */}
          <Card variant="elevated" className="mb-8 animate-fade-up" style={{ animationDelay: '0.05s' }}>
            <form onSubmit={handleProfileUpdate} className="p-6">
              <h2 className="text-xl font-semibold text-navy-900 dark:text-white mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Account Information
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-navy-900 dark:text-white mb-2">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    required
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Used for login and notifications
                  </p>
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-navy-900 dark:text-white mb-2">
                    Full Name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-navy-900 dark:text-white mb-2">
                    Phone Number (Optional)
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phoneNumber}
                    onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label htmlFor="timezone" className="block text-sm font-medium text-navy-900 dark:text-white mb-2">
                    Timezone
                  </label>
                  <Select
                    id="timezone"
                    value={profile.timezone}
                    onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                  >
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="America/Anchorage">Alaska Time</option>
                    <option value="Pacific/Honolulu">Hawaii Time</option>
                  </Select>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong className="text-navy-900 dark:text-white">Account Created:</strong>{' '}
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <Button type="submit" disabled={saving} leftIcon={
                saving ? undefined : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )
              }>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </Card>

          {/* Push Notifications */}
          <Card variant="elevated" className="mb-8 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-navy-900 dark:text-white mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Push Notifications
              </h2>

              {!pushSupported ? (
                <Alert variant="warning" className="mb-4">
                  Push notifications are not supported in this browser.
                </Alert>
              ) : pushPermission === 'denied' ? (
                <Alert variant="danger" className="mb-4">
                  Push notifications are blocked. Please enable them in your browser settings.
                </Alert>
              ) : (
                <>
                  {pushError && (
                    <Alert variant="danger" className="mb-4">
                      {pushError}
                    </Alert>
                  )}

                  <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl mb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-navy-900 dark:text-white mb-1">
                          {pushSubscribed ? 'Push Notifications Enabled' : 'Enable Push Notifications'}
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {pushSubscribed
                            ? 'You will receive real-time alerts for drug recalls and safety updates.'
                            : 'Get instant alerts on your device for drug recalls and safety updates.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {pushSubscribed ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const success = await sendTestNotification();
                                if (success) {
                                  setSuccessMessage('Test notification sent!');
                                  setTimeout(() => setSuccessMessage(null), 3000);
                                }
                              }}
                              disabled={pushLoading}
                            >
                              Test
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={unsubscribeFromPush}
                              disabled={pushLoading}
                              className="border-accent-300 text-accent-600 hover:bg-accent-50"
                            >
                              {pushLoading ? 'Processing...' : 'Disable'}
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={subscribeToPush}
                            disabled={pushLoading}
                          >
                            {pushLoading ? 'Enabling...' : 'Enable Notifications'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Notification Preferences */}
          <Card variant="elevated" className="mb-8 animate-fade-up" style={{ animationDelay: '0.15s' }}>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-navy-900 dark:text-white mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-warning-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Notification Preferences
              </h2>

              <div className="space-y-6 mb-6">
                <ToggleSwitch
                  checked={notifications.emailNotifications}
                  onChange={(checked) => setNotifications({ ...notifications, emailNotifications: checked })}
                  label="Email Notifications"
                  description="Receive email notifications for important updates"
                />
                <ToggleSwitch
                  checked={notifications.recallAlerts}
                  onChange={(checked) => setNotifications({ ...notifications, recallAlerts: checked })}
                  label="Recall Alerts"
                  description="Get notified about recalls affecting your pets' medications"
                />
                <ToggleSwitch
                  checked={notifications.medicationReminders}
                  onChange={(checked) => setNotifications({ ...notifications, medicationReminders: checked })}
                  label="Medication Reminders"
                  description="Receive reminders for your pets' medication schedules"
                />
                <ToggleSwitch
                  checked={notifications.safetyUpdates}
                  onChange={(checked) => setNotifications({ ...notifications, safetyUpdates: checked })}
                  label="Safety Updates"
                  description="Stay informed about new safety information for your pets' medications"
                />
                <ToggleSwitch
                  checked={notifications.newsletterSubscription}
                  onChange={(checked) => setNotifications({ ...notifications, newsletterSubscription: checked })}
                  label="Newsletter Subscription"
                  description="Receive our monthly newsletter with pet health tips and updates"
                />
              </div>

              <Button onClick={handleNotificationUpdate} disabled={saving}>
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </Card>

          {/* Privacy & Data */}
          <Card variant="elevated" className="mb-8 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-navy-900 dark:text-white mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Privacy & Data
              </h2>

              <div className="space-y-4">
                <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
                  <h3 className="font-semibold text-navy-900 dark:text-white mb-2">Data Export</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    Download a copy of all your data including pet profiles and medication records.
                  </p>
                  <Button variant="outline" leftIcon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  }>
                    Export My Data
                  </Button>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-navy-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <h3 className="font-semibold text-navy-900 dark:text-white mb-2">Data Privacy</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    Review our privacy policy and learn how we protect your data.
                  </p>
                  <Button variant="outline" onClick={() => navigate('/privacy')} leftIcon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }>
                    View Privacy Policy
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card variant="danger" className="animate-fade-up" style={{ animationDelay: '0.25s' }}>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-accent-600 dark:text-accent-400 mb-6 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Danger Zone
              </h2>

              <div className="p-4 bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 rounded-xl">
                <h3 className="font-semibold text-navy-900 dark:text-white mb-2">Delete Account</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border-accent-300 text-accent-600 hover:bg-accent-50 dark:hover:bg-accent-900/20"
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  }
                >
                  Delete My Account
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your pet profiles and data."
        confirmText="Delete Account"
        variant="danger"
      />
    </div>
  );
};

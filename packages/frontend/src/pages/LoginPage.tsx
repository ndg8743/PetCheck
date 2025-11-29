import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const LoginPageContent: React.FC = () => {
  const navigate = useNavigate();
  const { loginAsGuest, loginWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loginAsGuest();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to login as guest');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    setIsLoading(true);
    setError(null);
    try {
      if (credentialResponse.credential) {
        await loginWithGoogle(credentialResponse.credential);
        navigate('/dashboard');
      } else {
        setError('Failed to get Google credentials');
      }
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was unsuccessful. Please try again.');
  };

  const features = [
    { icon: 'search', text: 'Search FDA adverse event reports' },
    { icon: 'interaction', text: 'Check drug interactions' },
    { icon: 'recall', text: 'View active recalls' },
    { icon: 'pet', text: 'Create pet profiles' },
    { icon: 'vet', text: 'Find veterinarians nearby' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-primary-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-up">
        <Card variant="glass" className="backdrop-blur-xl bg-white/95 dark:bg-navy-800/95 shadow-elevated">
          <div className="p-8">
            {/* Logo/Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl mb-4 shadow-lg">
                <svg
                  viewBox="0 0 32 32"
                  className="w-12 h-12 text-white"
                  fill="currentColor"
                >
                  <circle cx="16" cy="20" r="6" />
                  <circle cx="10" cy="14" r="3" />
                  <circle cx="22" cy="14" r="3" />
                  <circle cx="7" cy="19" r="2.5" />
                  <circle cx="25" cy="19" r="2.5" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-navy-900 dark:text-white font-display mb-2">
                Welcome to Pet<span className="text-primary-600">Check</span>
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                FDA Animal Drug Safety Explorer
              </p>
            </div>

            {error && (
              <Alert variant="danger" className="mb-6">
                {error}
              </Alert>
            )}

            {/* Login Buttons */}
            <div className="space-y-4 mb-6">
              {/* Guest Login - Primary */}
              <Button
                onClick={handleGuestLogin}
                disabled={isLoading}
                size="lg"
                className="w-full"
                leftIcon={
                  isLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )
                }
              >
                {isLoading ? 'Signing in...' : 'Continue as Guest'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-navy-800 text-gray-500">or</span>
                </div>
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap
                  theme="outline"
                  size="large"
                  width="320"
                  text="signin_with"
                  shape="rectangular"
                />
              </div>
            </div>

            {/* Features */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <p className="text-sm font-semibold text-navy-900 dark:text-white mb-4">
                What you can do:
              </p>
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center">
                      <svg className="w-3 h-3 text-secondary-600 dark:text-secondary-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Disclaimer */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
                This app uses public FDA data. It is for informational purposes only
                and does not replace professional veterinary advice.
              </p>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
            <svg className="w-4 h-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-sm text-white/80">Powered by openFDA</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrap with GoogleOAuthProvider only on this page
export const LoginPage: React.FC = () => (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <LoginPageContent />
  </GoogleOAuthProvider>
);

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@petcheck/shared';
import api from '../lib/api';
import { secureStorage } from '../lib/secureStorage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isNewUser: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  signup: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  clearNewUserFlag: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  // Initialize auth state from secure storage
  useEffect(() => {
    const initAuth = () => {
      try {
        // Try secure storage first, fallback to old localStorage for migration
        let storedToken = secureStorage.getItem('authToken');
        let storedUser = secureStorage.getItem('user');

        // Migration: check old localStorage and migrate
        if (!storedToken && localStorage.getItem('authToken')) {
          storedToken = localStorage.getItem('authToken');
          if (storedToken) {
            secureStorage.setItem('authToken', storedToken);
            localStorage.removeItem('authToken');
          }
        }
        if (!storedUser && localStorage.getItem('user')) {
          storedUser = localStorage.getItem('user');
          if (storedUser) {
            secureStorage.setItem('user', storedUser);
            localStorage.removeItem('user');
          }
        }

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        secureStorage.removeItem('authToken');
        secureStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: newToken, user: newUser } = response.data;

      secureStorage.setItem('authToken', newToken);
      secureStorage.setItem('user', JSON.stringify(newUser));

      setToken(newToken);
      setUser(newUser);

      // Show tutorial if not completed
      const tutorialCompleted = localStorage.getItem('petcheck_tutorial_completed');
      if (!tutorialCompleted) {
        setIsNewUser(true);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const loginWithGoogle = async (credential: string) => {
    try {
      const response = await api.post('/auth/google', { credential });
      const { token: newToken, user: newUser, isNew } = response.data.data;

      secureStorage.setItem('authToken', newToken);
      secureStorage.setItem('user', JSON.stringify(newUser));

      setToken(newToken);
      setUser(newUser);

      // Check if this is a new user who hasn't completed the tutorial
      const tutorialCompleted = localStorage.getItem('petcheck_tutorial_completed');
      if (isNew || !tutorialCompleted) {
        setIsNewUser(true);
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      throw new Error(error.response?.data?.message || 'Google login failed');
    }
  };

  const loginAsGuest = async () => {
    try {
      const response = await api.post('/auth/guest');
      const { token: newToken, user: newUser } = response.data.data;

      secureStorage.setItem('authToken', newToken);
      secureStorage.setItem('user', JSON.stringify(newUser));

      setToken(newToken);
      setUser(newUser);

      // Guest users always see the tutorial if not completed
      const tutorialCompleted = localStorage.getItem('petcheck_tutorial_completed');
      if (!tutorialCompleted) {
        setIsNewUser(true);
      }
    } catch (error: any) {
      console.error('Guest login error:', error);
      throw new Error(error.response?.data?.message || 'Guest login failed');
    }
  };

  const signup = async (name: string, email: string, password: string, role: string) => {
    try {
      const response = await api.post('/auth/signup', { name, email, password, role });
      const { token: newToken, user: newUser } = response.data;

      secureStorage.setItem('authToken', newToken);
      secureStorage.setItem('user', JSON.stringify(newUser));

      setToken(newToken);
      setUser(newUser);

      // New signups always see the tutorial
      setIsNewUser(true);
    } catch (error: any) {
      console.error('Signup error:', error);
      throw new Error(error.response?.data?.message || 'Signup failed');
    }
  };

  const logout = () => {
    secureStorage.removeItem('authToken');
    secureStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    secureStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const clearNewUserFlag = () => {
    setIsNewUser(false);
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    isNewUser,
    login,
    loginWithGoogle,
    loginAsGuest,
    signup,
    logout,
    updateUser,
    clearNewUserFlag,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

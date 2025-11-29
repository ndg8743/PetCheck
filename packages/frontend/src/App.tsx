import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { OnboardingTutorial } from './components/common/OnboardingTutorial';

// Import actual pages
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DrugSearchPage } from './pages/DrugSearchPage';
import { DrugDetailPage } from './pages/DrugDetailPage';
import { PetListPage } from './pages/PetListPage';
import { PetDetailPage } from './pages/PetDetailPage';
import { PetCreatePage } from './pages/PetCreatePage';
import { RecallsPage } from './pages/RecallsPage';
import { InteractionCheckerPage } from './pages/InteractionCheckerPage';
import { VetFinderPage } from './pages/VetFinderPage';
import { ProfilePage } from './pages/ProfilePage';
import { ResearcherPage } from './pages/ResearcherPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Loading component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-navy-950">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      <p className="mt-4 text-slate-600 dark:text-slate-400">Loading PetCheck...</p>
    </div>
  </div>
);

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public route component (redirect to dashboard if authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Wrapper for pages that need the AppShell
const WithAppShell = ({ children }: { children: React.ReactNode }) => (
  <AppShell>{children}</AppShell>
);

function App() {
  const { isNewUser, clearNewUserFlag } = useAuth();

  const handleTutorialComplete = () => {
    localStorage.setItem('petcheck_tutorial_completed', 'true');
    clearNewUserFlag();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950">
      {/* Onboarding Tutorial for new users */}
      <OnboardingTutorial
        isOpen={isNewUser}
        onClose={clearNewUserFlag}
        onComplete={handleTutorialComplete}
      />

      <Routes>
        {/* Public routes (no AppShell) */}
        <Route path="/" element={<HomePage />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* Semi-public routes with AppShell */}
        <Route path="/drugs" element={<WithAppShell><DrugSearchPage /></WithAppShell>} />
        <Route path="/drugs/search" element={<WithAppShell><DrugSearchPage /></WithAppShell>} />
        <Route path="/drugs/:drugId" element={<WithAppShell><DrugDetailPage /></WithAppShell>} />
        <Route path="/recalls" element={<WithAppShell><RecallsPage /></WithAppShell>} />
        <Route path="/interactions" element={<WithAppShell><InteractionCheckerPage /></WithAppShell>} />
        <Route path="/vets" element={<WithAppShell><VetFinderPage /></WithAppShell>} />

        {/* Protected routes with AppShell */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <WithAppShell><DashboardPage /></WithAppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pets"
          element={
            <ProtectedRoute>
              <WithAppShell><PetListPage /></WithAppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pets/new"
          element={
            <ProtectedRoute>
              <WithAppShell><PetCreatePage /></WithAppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pets/:id"
          element={
            <ProtectedRoute>
              <WithAppShell><PetDetailPage /></WithAppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pets/:id/edit"
          element={
            <ProtectedRoute>
              <WithAppShell><PetCreatePage /></WithAppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <WithAppShell><ProfilePage /></WithAppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/researcher"
          element={
            <ProtectedRoute>
              <WithAppShell><ResearcherPage /></WithAppShell>
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default App;

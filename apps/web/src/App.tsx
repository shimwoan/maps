import { useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomeScreen, IntroScreen, AuthProvider, NotificationProvider, useAuth } from '@monorepo/shared';
import { AdminAuthProvider, useAdminAuth } from './admin/contexts/AdminAuthContext';
import {
  LoginPage as AdminLoginPage,
  DashboardPage as AdminDashboardPage,
  ProfilesPage as AdminProfilesPage,
  RequestsPage as AdminRequestsPage,
  ApplicationsPage as AdminApplicationsPage,
} from './admin/pages';
import { Loader2 } from 'lucide-react';
import './admin/admin.css';

// OAuth 리다이렉트 감지 (URL에 인증 관련 해시가 있는 경우)
const checkOAuthReturn = () => {
  const hash = window.location.hash;
  return hash.includes('access_token') || hash.includes('error');
};

function MainPage() {
  const { loading } = useAuth();
  const introPassedRef = useRef(false); // 현재 세션에서 인트로 통과 여부

  const [showIntro, setShowIntro] = useState(() => {
    // OAuth 리다이렉트면 인트로 스킵 (URL 해시로만 판단)
    if (checkOAuthReturn()) {
      return false;
    }
    return true;
  });

  // 인트로 완료
  const handleIntroComplete = () => {
    introPassedRef.current = true;
    setShowIntro(false);
  };

  if (loading) {
    return null;
  }

  // 인트로 표시
  if (showIntro) {
    return <IntroScreen onStart={handleIntroComplete} />;
  }

  return <HomeScreen />;
}

// Admin Loading Spinner
function AdminLoadingSpinner() {
  return (
    <div className="tw-flex tw-h-screen tw-items-center tw-justify-center">
      <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
    </div>
  );
}

// Admin Protected Route
function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) {
    return <AdminLoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

// Admin Public Route (로그인 페이지)
function AdminPublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) {
    return <AdminLoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

// Admin Routes
function AdminRoutes() {
  return (
    <div className="admin-root">
      <AdminAuthProvider>
        <Routes>
          <Route
            path="login"
            element={
              <AdminPublicRoute>
                <AdminLoginPage />
              </AdminPublicRoute>
            }
          />
          <Route
            path="/"
            element={
              <AdminProtectedRoute>
                <AdminDashboardPage />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="profiles"
            element={
              <AdminProtectedRoute>
                <AdminProfilesPage />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="requests"
            element={
              <AdminProtectedRoute>
                <AdminRequestsPage />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="applications"
            element={
              <AdminProtectedRoute>
                <AdminApplicationsPage />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="analytics"
            element={
              <AdminProtectedRoute>
                <AdminDashboardPage />
              </AdminProtectedRoute>
            }
          />
        </Routes>
      </AdminAuthProvider>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/admin/*" element={<AdminRoutes />} />
            <Route path="/*" element={<MainPage />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

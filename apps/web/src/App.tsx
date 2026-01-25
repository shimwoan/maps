import { useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomeScreen, IntroScreen, AuthProvider, NotificationProvider, useAuth, useProfile, isAdminNickname } from '@monorepo/shared';
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

// 공유 링크 감지 (URL에 requestId 파라미터가 있는 경우)
const checkSharedLink = () => {
  const params = new URLSearchParams(window.location.search);
  return params.has('requestId');
};

function MainPage() {
  const { loading } = useAuth();
  const introPassedRef = useRef(false); // 현재 세션에서 인트로 통과 여부

  const [showIntro, setShowIntro] = useState(() => {
    // OAuth 리다이렉트면 인트로 스킵 (URL 해시로만 판단)
    if (checkOAuthReturn()) {
      return false;
    }
    // 공유 링크면 인트로 스킵
    if (checkSharedLink()) {
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

// Admin Access Denied 페이지
function AdminAccessDenied() {
  return (
    <div className="tw-flex tw-h-screen tw-flex-col tw-items-center tw-justify-center tw-bg-gray-100">
      <div className="tw-text-center tw-p-8 tw-bg-white tw-rounded-lg tw-shadow-lg tw-max-w-md">
        <div className="tw-text-6xl tw-mb-4">🚫</div>
        <h1 className="tw-text-2xl tw-font-bold tw-text-gray-800 tw-mb-2">접근 거부</h1>
        <p className="tw-text-gray-600 tw-mb-6">
          관리자 페이지에 접근할 권한이 없습니다.
        </p>
        <a
          href="/"
          className="tw-inline-block tw-px-6 tw-py-3 tw-bg-blue-600 tw-text-white tw-rounded-lg tw-font-medium hover:tw-bg-blue-700 tw-transition-colors tw-no-underline"
        >
          메인으로 돌아가기
        </a>
      </div>
    </div>
  );
}

// Admin Protected Route
function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();

  if (isLoading || profileLoading) {
    return <AdminLoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // 닉네임 검증 - Supabase 로그인된 유저의 프로필 닉네임 확인
  if (!user || !isAdminNickname(profile?.nickname)) {
    return <AdminAccessDenied />;
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

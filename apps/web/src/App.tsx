import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { HomeScreen, IntroScreen, AuthProvider, useAuth, storage, STORAGE_KEYS } from '@monorepo/shared';

function IntroPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const skipIntro = storage.getItem(STORAGE_KEYS.SKIP_INTRO) === 'true';
  const shouldRedirect = user || skipIntro;

  useEffect(() => {
    if (loading) return;

    // 로그인 상태이거나 "다시 보지 않기" 체크 시 /home으로 리다이렉트
    if (shouldRedirect) {
      navigate('/home', { replace: true });
    }
  }, [loading, shouldRedirect, navigate]);

  // 인증 로딩 중이거나 리다이렉트 예정이면 빈 화면 표시 (깜박임 방지)
  if (loading || shouldRedirect) {
    return null;
  }

  const handleStart = () => {
    navigate('/home');
  };

  return <IntroScreen onStart={handleStart} />;
}

function HomePage() {
  const { loading } = useAuth();

  if (loading) {
    return null;
  }

  return <HomeScreen />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<IntroPage />} />
          <Route path="/home" element={<HomePage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

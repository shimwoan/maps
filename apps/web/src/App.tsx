import { useState, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomeScreen, IntroScreen, AuthProvider, NotificationProvider, useAuth } from '@monorepo/shared';

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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/*" element={<MainPage />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

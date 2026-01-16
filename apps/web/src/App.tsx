import { useState } from 'react';
import { HomeScreen, IntroScreen, AuthProvider, storage, STORAGE_KEYS } from '@monorepo/shared';

function App() {
  // 인트로 표시 여부 결정
  // 1. "다시 보지 않기" 체크했으면 영구적으로 스킵 (localStorage)
  // 2. 현재 세션에서 이미 봤으면 스킵 (sessionStorage)
  const [showIntro, setShowIntro] = useState(() => {
    const skipPermanently = storage.getItem(STORAGE_KEYS.SKIP_INTRO) === 'true';
    if (skipPermanently) return false;

    const seenThisSession = sessionStorage.getItem('introSeen') === 'true';
    return !seenThisSession;
  });

  const handleStartFromIntro = () => {
    sessionStorage.setItem('introSeen', 'true');
    setShowIntro(false);
  };

  return (
    <AuthProvider>
      {showIntro ? (
        <IntroScreen onStart={handleStartFromIntro} />
      ) : (
        <HomeScreen />
      )}
    </AuthProvider>
  );
}

export default App;

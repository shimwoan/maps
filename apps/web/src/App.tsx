import { useState } from 'react';
import { HomeScreen, IntroScreen, AuthProvider } from '@monorepo/shared';

function App() {
  // 세션 스토리지에서 인트로 완료 여부 확인
  const [showIntro, setShowIntro] = useState(() => {
    return sessionStorage.getItem('introSeen') !== 'true';
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

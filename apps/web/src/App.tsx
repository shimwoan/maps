import { HomeScreen } from '@monorepo/shared';

const NAVER_MAP_CLIENT_ID = import.meta.env.VITE_NAVER_MAP_CLIENT_ID || '';

function App() {
  return <HomeScreen naverMapClientId={NAVER_MAP_CLIENT_ID} />;
}

export default App;

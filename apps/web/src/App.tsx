import { HomeScreen, AuthProvider } from '@monorepo/shared';

function App() {
  return (
    <AuthProvider>
      <HomeScreen />
    </AuthProvider>
  );
}

export default App;

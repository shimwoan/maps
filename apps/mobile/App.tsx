import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider, type TamaguiProviderProps } from 'tamagui';
import { QueryClientProvider, createQueryClient, HomeScreen } from '@monorepo/shared';
import config from './src/tamagui.config';

const queryClient = createQueryClient();

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <TamaguiProvider config={config as unknown as TamaguiProviderProps['config']}>
          <HomeScreen />
        </TamaguiProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default App;

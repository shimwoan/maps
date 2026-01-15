import React from 'react';
import ReactDOM from 'react-dom/client';
import { TamaguiProvider, type TamaguiProviderProps } from 'tamagui';
import { QueryClientProvider } from '@monorepo/shared';
import { createQueryClient } from '@monorepo/shared';
import config from './tamagui.config';
import App from './App';
import './index.css';

const queryClient = createQueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TamaguiProvider config={config as unknown as TamaguiProviderProps['config']} defaultTheme="light">
        <App />
      </TamaguiProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

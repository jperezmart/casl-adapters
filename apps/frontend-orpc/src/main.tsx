import './styles.css';

import { toORPCError } from '@orpc/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.js';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

const queryClient = new QueryClient({
  defaultOptions: {
    // A 401 or a 403 will not change on a retry.
    queries: {
      retry: (failures, error) =>
        ![401, 403].includes(toORPCError(error).status) && failures < 3,
    },
  },
});

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);

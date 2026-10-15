import './styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.js';
import { AbilityProvider } from './casl.js';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    {/* No `fetchRules`: the default fetch of /api/me/abilities, with the
        session cookie, which Vite proxies to the backend's Rules endpoint. */}
    <AbilityProvider>
      <App />
    </AbilityProvider>
  </StrictMode>,
);

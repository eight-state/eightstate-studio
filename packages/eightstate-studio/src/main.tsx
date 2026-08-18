import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@mastra/playground-ui/style.css';
import '@/index.css';
import './brand.css';

import App, { routes } from '@eightstate/upstream-app';
import { removeAgentBuilderRoutes } from './studio-routes';

export function startStudio(): void {
  removeAgentBuilderRoutes(routes);

  if (import.meta.env.DEV && import.meta.env.VITE_REACT_GRAB === 'true') {
    void import('react-grab');
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('EightState Studio requires a #root element');
  }
  rootElement.dataset.testid = 'eightstate-studio-root';

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

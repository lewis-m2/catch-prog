import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyTheme } from './hooks/useTheme';
import './index.css';
import { useSettings } from './state/settings';

// Before the first render, so a dark-theme user doesn't get a white flash.
applyTheme(useSettings.getState().theme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

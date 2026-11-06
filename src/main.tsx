import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyTheme, loadThemeSetting } from './hooks/useTheme';
import './index.css';

// Before the first render, so a dark-theme user doesn't get a white flash.
applyTheme(loadThemeSetting());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

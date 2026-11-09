import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { requestPersistentStorage } from './db/sessions';
import { applyAppearance } from './hooks/useTheme';
import './index.css';
import { useSettings } from './state/settings';
import { useStagger } from './state/stagger';
import { useTimers } from './state/timers';

// Before the first render, so a dark-theme user doesn't get a white flash.
applyAppearance(useSettings.getState());

requestPersistentStorage().catch(() => {});

// Restore a running session before showing anything, so the clocks never
// flash "No session" after a reload. If storage fails, the app still opens.
useTimers
  .getState()
  .load()
  // Then the staggered piece of that session, if one is on screen.
  .then(() => useStagger.getState().load())
  .catch((error: unknown) => console.error('Could not load the active session', error))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });

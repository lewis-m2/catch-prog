import { useEffect, useRef, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SessionBar } from './components/SessionBar';
import { TabBar } from './components/TabBar';
import { UpdatePrompt } from './components/UpdatePrompt';
import { useApplyTheme } from './hooks/useTheme';
import { useWakeLock } from './hooks/useWakeLock';
import { CrewEdit } from './screens/CrewEdit';
import { Crews } from './screens/Crews';
import { Pieces } from './screens/Pieces';
import { PrognosticImport } from './screens/PrognosticImport';
import { PrognosticTables } from './screens/PrognosticTables';
import { QuickAdd } from './screens/QuickAdd';
import { Rate } from './screens/Rate';
import { Settings } from './screens/Settings';
import { Timers } from './screens/Timers';
import { useSettings } from './state/settings';
import { useTimers } from './state/timers';

export function App() {
  useApplyTheme();
  // Keep the screen on for the whole session, breaks included.
  const sessionActive = useTimers((state) => state.session !== null);
  const keepAwake = useSettings((state) => state.wakeLock);
  const wakeLock = useWakeLock(sessionActive && keepAwake);

  return (
    // HashRouter keeps the route after the #, so GitHub Pages only ever has to
    // serve index.html and a reload on any screen can't hit a 404.
    <HashRouter>
      <div className="flex h-dvh flex-col">
        <SessionBar />
        <Main>
          <Routes>
            <Route path="/rate" element={<Rate />} />
            <Route path="/timers" element={<Timers wakeLock={wakeLock} />} />
            <Route path="/pieces" element={<Pieces />} />
            <Route path="/crews" element={<Crews />} />
            {/* Nested under /crews so the Crews tab stays highlighted. */}
            <Route path="/crews/new" element={<CrewEdit />} />
            <Route path="/crews/quick-add" element={<QuickAdd />} />
            <Route path="/crews/settings" element={<Settings />} />
            <Route path="/crews/settings/progs" element={<PrognosticTables />} />
            <Route path="/crews/settings/progs/import" element={<PrognosticImport />} />
            <Route path="/crews/:id" element={<CrewEdit />} />
            <Route path="*" element={<Navigate to="/rate" replace />} />
          </Routes>
        </Main>
        <UpdatePrompt />
        <TabBar />
      </div>
    </HashRouter>
  );
}

/** The scrolling area between the bars. Each new screen starts at the top. */
function Main({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    // Braces matter: newer browsers return a Promise from scrollTo, which React must not get back.
    ref.current?.scrollTo(0, 0);
  }, [pathname]);
  return (
    <main ref={ref} className="min-h-0 flex-1 overflow-y-auto p-4">
      {children}
    </main>
  );
}

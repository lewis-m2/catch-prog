import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SessionBar } from './components/SessionBar';
import { TabBar } from './components/TabBar';
import { UpdatePrompt } from './components/UpdatePrompt';
import { useApplyTheme } from './hooks/useTheme';
import { Crews } from './screens/Crews';
import { Pieces } from './screens/Pieces';
import { Rate } from './screens/Rate';
import { Settings } from './screens/Settings';
import { Timers } from './screens/Timers';

export function App() {
  useApplyTheme();

  return (
    // HashRouter keeps the route after the #, so GitHub Pages only ever has to
    // serve index.html and a reload on any screen can't hit a 404.
    <HashRouter>
      <div className="flex h-dvh flex-col">
        <SessionBar />
        <main className="min-h-0 flex-1 overflow-y-auto p-4">
          <Routes>
            <Route path="/rate" element={<Rate />} />
            <Route path="/timers" element={<Timers />} />
            <Route path="/pieces" element={<Pieces />} />
            <Route path="/crews" element={<Crews />} />
            {/* Nested under /crews so the Crews tab stays highlighted. */}
            <Route path="/crews/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/rate" replace />} />
          </Routes>
        </main>
        <UpdatePrompt />
        <TabBar />
      </div>
    </HashRouter>
  );
}

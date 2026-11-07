import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StrokeCount } from '../lib/rate';
import type { ThemeSetting } from '../lib/theme';

// The coach's settings (SPEC §7). More are added in Phase 3.
// Saved to localStorage rather than IndexedDB: it is read synchronously at
// startup, so the right theme and stroke count are there from the first paint.

export interface RateSettings {
  strokes: StrokeCount;
  continuous: boolean;
  autoResetSec: number;
}

interface SettingsState {
  theme: ThemeSetting;
  rate: RateSettings;
  setTheme: (theme: ThemeSetting) => void;
  setRateStrokes: (strokes: StrokeCount) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'sun',
      rate: { strokes: 2, continuous: true, autoResetSec: 10 },
      setTheme: (theme) => set({ theme }),
      setRateStrokes: (strokes) => set((state) => ({ rate: { ...state.rate, strokes } })),
    }),
    {
      name: 'launch.settings',
      version: 1,
      // Merge nested groups, so settings added in a later version get their
      // defaults instead of being wiped by an older saved copy.
      merge: (saved, current) => {
        const stored = (saved ?? {}) as Partial<SettingsState>;
        return { ...current, ...stored, rate: { ...current.rate, ...stored.rate } };
      },
    },
  ),
);

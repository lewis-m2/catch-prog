import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TextScale } from '../lib/appearance';
import type { ProgramSetting } from '../lib/programme';
import type { StrokeCount } from '../lib/rate';
import type { ThemeSetting } from '../lib/theme';

// The coach's settings (SPEC §7).
// Saved to localStorage rather than IndexedDB: it is read synchronously at
// startup, so the right theme and colours are there from the first paint.

export interface RateSettings {
  strokes: StrokeCount;
  continuous: boolean;
  autoResetSec: number;
}

export interface SettingsData {
  /** Null until the coach has chosen (asked on first run). */
  program: ProgramSetting | null;
  theme: ThemeSetting;
  /** Null = the theme's own colour. */
  accent: string | null;
  goColor: string | null;
  stopColor: string | null;
  textScale: TextScale;
  /** Start gaps for staggered pieces are rounded to this (Phase 4). */
  gapRounding: 0.5 | 1;
  rate: RateSettings;
  haptics: boolean;
  wakeLock: boolean;
  /** The crew chip on the Rate screen: readings are saved against it. */
  rateCrewId: string | null;
}

interface SettingsState extends SettingsData {
  update: (patch: Partial<Omit<SettingsData, 'rate'>>) => void;
  updateRate: (patch: Partial<RateSettings>) => void;
  setTheme: (theme: ThemeSetting) => void;
  setRateStrokes: (strokes: StrokeCount) => void;
}

export const DEFAULT_SETTINGS: SettingsData = {
  program: null,
  theme: 'sun',
  accent: null,
  goColor: null,
  stopColor: null,
  textScale: 1,
  gapRounding: 0.5,
  rate: { strokes: 2, continuous: true, autoResetSec: 10 },
  haptics: true,
  wakeLock: true,
  rateCrewId: null,
};

/**
 * Saved settings on top of the defaults. Nested groups are merged too, so a
 * setting added in a later version gets its default instead of being lost.
 */
export function mergeSettings(saved: unknown, current: SettingsData): SettingsData {
  const stored = (saved && typeof saved === 'object' ? saved : {}) as Partial<SettingsData>;
  const merged = { ...current };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof SettingsData)[]) {
    if (key in stored && stored[key] !== undefined) Object.assign(merged, { [key]: stored[key] });
  }
  merged.rate = { ...current.rate, ...stored.rate };
  return merged;
}

/** Just the data, for backups. */
export function settingsData(state: SettingsData): SettingsData {
  const data = {} as SettingsData;
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof SettingsData)[]) Object.assign(data, { [key]: state[key] });
  return data;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      updateRate: (patch) => set((state) => ({ rate: { ...state.rate, ...patch } })),
      setTheme: (theme) => set({ theme }),
      setRateStrokes: (strokes) => set((state) => ({ rate: { ...state.rate, strokes } })),
    }),
    {
      name: 'launch.settings',
      version: 1,
      merge: (saved, current) => ({ ...current, ...mergeSettings(saved, current) }),
      partialize: (state) => settingsData(state),
    },
  ),
);

// Appearance settings (SPEC §7c) turned into CSS custom properties. Pure functions.
// Colours left as null use the theme's own values from index.css.

import { MIN_CONTRAST, contrastRatio, parseHex, textColourOn } from './colour';
import type { ResolvedTheme } from './theme';

export type TextScale = 1 | 1.15 | 1.3;

export const TEXT_SCALES: { value: TextScale; label: string }[] = [
  { value: 1, label: 'Normal' },
  { value: 1.15, label: 'Large' },
  { value: 1.3, label: 'Extra large' },
];

export interface Appearance {
  accent: string | null;
  goColor: string | null;
  stopColor: string | null;
  textScale: TextScale;
}

/** All pass 3:1 on both the Sun and Dawn backgrounds (checked in the tests). */
export const ACCENT_PRESETS: { name: string; hex: string }[] = [
  { name: 'Blue', hex: '#0057ff' },
  { name: 'Orange', hex: '#e05a00' },
  { name: 'Purple', hex: '#7a4dff' },
  { name: 'Teal', hex: '#00838c' },
  { name: 'Magenta', hex: '#c8237f' },
  { name: 'Club green', hex: '#12803c' },
];

/** Blue for go, orange for stop: told apart with the common kinds of colour blindness. */
export const COLOUR_BLIND_GO_STOP = { goColor: '#0072b2', stopColor: '#d55e00' };

export const THEME_BACKGROUND: Record<ResolvedTheme, string> = { sun: '#ffffff', dawn: '#0b0f12' };

/** CSS variable → value, or null to remove it (and fall back to the theme's value). */
export function appearanceVars(appearance: Appearance): Record<string, string | null> {
  const vars: Record<string, string | null> = { '--text-scale': String(appearance.textScale) };
  const colours: [string, string | null][] = [
    ['accent', appearance.accent],
    ['go', appearance.goColor],
    ['stop', appearance.stopColor],
  ];
  for (const [name, hex] of colours) {
    const rgb = hex ? parseHex(hex) : null;
    vars[`--${name}`] = rgb ? hex : null;
    // Text on a custom colour is black or white, whichever reads better.
    vars[`--on-${name}`] = rgb ? textColourOn(rgb) : null;
  }
  return vars;
}

/** The themes in which this colour is hard to see against the background. */
export function lowContrastThemes(hex: string): ResolvedTheme[] {
  const rgb = parseHex(hex);
  if (!rgb) return [];
  return (Object.keys(THEME_BACKGROUND) as ResolvedTheme[]).filter(
    (theme) => contrastRatio(rgb, parseHex(THEME_BACKGROUND[theme])!) < MIN_CONTRAST,
  );
}

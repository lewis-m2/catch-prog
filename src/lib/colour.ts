// Colour maths for the appearance settings (SPEC §7c). Pure functions.
// Contrast follows WCAG: 1:1 (none) to 21:1 (black on white).

export type Rgb = [number, number, number];

/** `#rgb` or `#rrggbb` (the # is optional). Null if it isn't a hex colour. */
export function parseHex(text: string): Rgb | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!match) return null;
  let hex = match[1]!;
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

/** `#rrggbb`, lower case. Null if it isn't a hex colour. */
export function normaliseHex(text: string): string | null {
  const rgb = parseHex(text);
  return rgb ? `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}` : null;
}

export function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

const BLACK: Rgb = [0, 0, 0];
const WHITE: Rgb = [255, 255, 255];

/** Black or white, whichever is easier to read on `background`. */
export function textColourOn(background: Rgb): '#000000' | '#ffffff' {
  return contrastRatio(background, BLACK) >= contrastRatio(background, WHITE) ? '#000000' : '#ffffff';
}

/**
 * Large bold text needs 3:1 (WCAG). Below that, a colour used for text or
 * buttons is hard to pick out, which in sunlight is worse still.
 */
export const MIN_CONTRAST = 3;

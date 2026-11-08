import { describe, expect, it } from 'vitest';
import { ACCENT_PRESETS, COLOUR_BLIND_GO_STOP, appearanceVars, lowContrastThemes } from './appearance';
import { contrastRatio, normaliseHex, parseHex, textColourOn } from './colour';

describe('colour', () => {
  it('parses short and long hex', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
    expect(parseHex('0057FF')).toEqual([0, 87, 255]);
    expect(parseHex('blue')).toBeNull();
    expect(normaliseHex('#ABC')).toBe('#aabbcc');
  });

  it('gives the WCAG contrast ratio', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(contrastRatio([255, 255, 255], [255, 255, 255])).toBe(1);
  });

  it('picks black or white text, whichever reads better', () => {
    expect(textColourOn(parseHex('#0057ff')!)).toBe('#ffffff');
    expect(textColourOn(parseHex('#f5a400')!)).toBe('#000000');
  });
});

describe('appearance', () => {
  it('every accent preset and the colour-blind pair are readable on both themes', () => {
    for (const hex of [...ACCENT_PRESETS.map((p) => p.hex), COLOUR_BLIND_GO_STOP.goColor, COLOUR_BLIND_GO_STOP.stopColor]) {
      expect(lowContrastThemes(hex), hex).toEqual([]);
    }
  });

  it('warns about a pale accent on Sun and a dark one on Dawn', () => {
    expect(lowContrastThemes('#ffe066')).toEqual(['sun']);
    expect(lowContrastThemes('#1a1a40')).toEqual(['dawn']);
  });

  it('sets custom colours with readable text, and clears the rest back to the theme', () => {
    const vars = appearanceVars({ accent: '#f5a400', goColor: null, stopColor: null, textScale: 1.15 });
    expect(vars).toEqual({
      '--text-scale': '1.15',
      '--accent': '#f5a400',
      '--on-accent': '#000000',
      '--go': null,
      '--on-go': null,
      '--stop': null,
      '--on-stop': null,
    });
  });

  it('ignores a colour that is not valid hex', () => {
    expect(appearanceVars({ accent: 'nope', goColor: null, stopColor: null, textScale: 1 })['--accent']).toBeNull();
  });
});

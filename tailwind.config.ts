import type { Config } from 'tailwindcss';

// Colours point at CSS custom properties (defined in src/index.css) rather than
// fixed values, so the theme and the coach's colour choices apply without a rebuild.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        go: 'var(--go)',
        stop: 'var(--stop)',
        warn: 'var(--warn)',
        'on-accent': 'var(--on-accent)',
        'on-go': 'var(--on-go)',
        'on-stop': 'var(--on-stop)',
      },
      minHeight: {
        primary: '64px', // primary buttons
        control: '48px', // everything else that can be tapped
      },
    },
  },
} satisfies Config;

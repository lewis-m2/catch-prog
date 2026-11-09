export type ButtonVariant = 'primary' | 'secondary' | 'go' | 'stop' | 'outline';

// Text colours chosen for contrast in sunlight: black on green, white on red/blue.
// They are CSS variables, so a custom colour gets black or white text, whichever reads better.
export const BUTTON_COLOURS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent',
  secondary: 'bg-surface text-ink',
  go: 'bg-go text-on-go',
  stop: 'bg-stop text-on-stop',
  /** For a secondary button on a surface-coloured card, where `secondary` would disappear. */
  outline: 'bg-bg text-ink border-2 border-muted',
};

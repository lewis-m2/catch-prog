export type ButtonVariant = 'primary' | 'secondary' | 'go' | 'stop';

// Text colours chosen for contrast in sunlight: black on green, white on red/blue.
// They are CSS variables, so a custom colour gets black or white text, whichever reads better.
export const BUTTON_COLOURS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent',
  secondary: 'bg-surface text-ink',
  go: 'bg-go text-on-go',
  stop: 'bg-stop text-on-stop',
};

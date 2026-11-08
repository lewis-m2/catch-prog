export type ButtonVariant = 'primary' | 'secondary' | 'go' | 'stop';

// Text colours chosen for contrast in sunlight: black on green, white on red/blue.
export const BUTTON_COLOURS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white',
  secondary: 'bg-surface text-ink',
  go: 'bg-go text-black',
  stop: 'bg-stop text-white',
};

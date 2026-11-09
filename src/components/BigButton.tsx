import type { ButtonHTMLAttributes } from 'react';
import { useHaptics } from '../hooks/useHaptics';
import { BUTTON_COLOURS, type ButtonVariant } from './buttonStyles';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Height: 64px (primary) or 48px (control). Defaults to 48px for secondary buttons, 64px for the rest. */
  size?: 'primary' | 'control';
}

/**
 * Standard button: meets the minimum tap sizes and vibrates on tap.
 * Secondary and outline buttons are 48px tall, the rest 64px. For anything that records a
 * time, use TimingButton instead.
 */
export function BigButton({ variant = 'primary', size, className = '', onClick, type = 'button', ...rest }: Props) {
  const haptics = useHaptics();
  const height = (size ?? (variant === 'secondary' || variant === 'outline' ? 'control' : 'primary')) === 'control' ? 'min-h-control text-lg' : 'min-h-primary text-xl';
  return (
    <button
      type={type}
      className={`rounded-xl px-4 font-bold active:opacity-70 ${height} ${BUTTON_COLOURS[variant]} ${className}`}
      onClick={(event) => {
        haptics.tap();
        onClick?.(event);
      }}
      {...rest}
    />
  );
}

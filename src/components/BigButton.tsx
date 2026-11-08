import type { ButtonHTMLAttributes } from 'react';
import { useHaptics } from '../hooks/useHaptics';
import { BUTTON_COLOURS, type ButtonVariant } from './buttonStyles';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/**
 * Standard button: meets the minimum tap sizes and vibrates on tap.
 * Secondary buttons are 48px tall, the rest 64px. For anything that records a
 * time, use TimingButton instead.
 */
export function BigButton({ variant = 'primary', className = '', onClick, type = 'button', ...rest }: Props) {
  const haptics = useHaptics();
  const size = variant === 'secondary' ? 'min-h-control text-lg' : 'min-h-primary text-xl';
  return (
    <button
      type={type}
      className={`rounded-xl px-4 font-bold active:opacity-70 ${size} ${BUTTON_COLOURS[variant]} ${className}`}
      onClick={(event) => {
        haptics.tap();
        onClick?.(event);
      }}
      {...rest}
    />
  );
}

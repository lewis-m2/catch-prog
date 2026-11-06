import type { ButtonHTMLAttributes } from 'react';
import { useHaptics } from '../hooks/useHaptics';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

const VARIANTS = {
  primary: 'min-h-primary bg-accent text-white text-xl',
  secondary: 'min-h-control bg-surface text-ink text-lg',
};

/** Standard button: meets the minimum tap sizes and vibrates on tap. */
export function BigButton({ variant = 'primary', className = '', onClick, type = 'button', ...rest }: Props) {
  const haptics = useHaptics();
  return (
    <button
      type={type}
      className={`rounded-xl px-4 font-bold active:opacity-70 ${VARIANTS[variant]} ${className}`}
      onClick={(event) => {
        haptics.tap();
        onClick?.(event);
      }}
      {...rest}
    />
  );
}

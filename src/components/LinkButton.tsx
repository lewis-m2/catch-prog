import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useHaptics } from '../hooks/useHaptics';
import { BUTTON_COLOURS, type ButtonVariant } from './buttonStyles';

/** A link that looks and feels like a BigButton (same sizes, vibrates on tap). */
export function LinkButton({
  to,
  variant = 'primary',
  size = 'primary',
  className = '',
  children,
}: {
  to: string;
  variant?: ButtonVariant;
  size?: 'primary' | 'control';
  className?: string;
  children: ReactNode;
}) {
  const haptics = useHaptics();
  const height = size === 'primary' ? 'min-h-primary text-xl' : 'min-h-control text-lg';
  return (
    <Link
      to={to}
      onClick={() => haptics.tap()}
      className={`flex items-center justify-center rounded-xl px-4 font-bold active:opacity-70 ${height} ${BUTTON_COLOURS[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

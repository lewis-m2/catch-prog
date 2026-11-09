import type { ReactNode } from 'react';
import { useHaptics } from '../hooks/useHaptics';
import { tapTime } from '../lib/time';
import { BUTTON_COLOURS, type ButtonVariant } from './buttonStyles';

interface Props {
  /** Called with the time (epoch ms) the finger touched the button. */
  onPress: (at: number) => void;
  variant?: ButtonVariant;
  /** primary: 64px. hero: 96px, for START and FINISH. control: 48px, for small corrections. */
  height?: 'primary' | 'hero' | 'control';
  className?: string;
  children: ReactNode;
  'aria-label'?: string;
}

/**
 * A 64px button for anything that records a time (start, stop, split).
 * It acts when the finger touches down, not when it lifts like a normal click,
 * so the recorded time is when the coach actually pressed.
 */
const HEIGHTS = { primary: 'min-h-primary text-xl', hero: 'min-h-24 text-3xl', control: 'min-h-control text-lg' };

export function TimingButton({ onPress, variant = 'primary', height = 'primary', className = '', children, ...rest }: Props) {
  const haptics = useHaptics();
  const press = (eventTimeStamp: number) => {
    haptics.tap();
    onPress(tapTime(eventTimeStamp));
  };

  return (
    <button
      type="button"
      onPointerDown={(event) => {
        if (event.isPrimary && event.button === 0) press(event.timeStamp);
      }}
      onKeyDown={(event) => {
        if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
          event.preventDefault();
          press(event.timeStamp);
        }
      }}
      // touch-none: a touch here is always a press, never the start of a scroll.
      className={`${HEIGHTS[height]} touch-none select-none rounded-xl px-4 font-bold active:brightness-90 ${BUTTON_COLOURS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

import type { ReactNode } from 'react';
import { ScreenHeader } from './ScreenHeader';

/** Stands in for a screen until its build phase. */
export function PlaceholderScreen({ title, phase, action }: { title: string; phase: number; action?: ReactNode }) {
  return (
    <>
      <ScreenHeader title={title} action={action} />
      <p className="text-lg text-muted">Coming in Phase {phase}.</p>
    </>
  );
}

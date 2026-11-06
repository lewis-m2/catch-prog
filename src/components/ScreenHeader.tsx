import type { ReactNode } from 'react';

export function ScreenHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="mb-4 flex min-h-control items-center justify-between gap-2">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      {action}
    </header>
  );
}

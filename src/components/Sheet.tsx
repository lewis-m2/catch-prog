import { useEffect, useId, type ReactNode } from 'react';
import { BigButton } from './BigButton';

/** A panel that slides up from the bottom, within thumb reach. Tapping outside it cancels. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-bg p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id={titleId} className="text-2xl font-extrabold">
            {title}
          </h2>
          <BigButton variant="secondary" onClick={onClose}>
            Close
          </BigButton>
        </div>
        {children}
      </div>
    </div>
  );
}

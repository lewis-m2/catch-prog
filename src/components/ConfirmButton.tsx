import { useState } from 'react';
import { BigButton } from './BigButton';

interface Props {
  label: string;
  question: string;
  confirmLabel: string;
  onConfirm: () => void;
}

/** Ignores a confirm tap this soon after arming, so a double tap can't confirm by accident. */
const ARM_DELAY_MS = 500;

/** For destructive actions: the first tap asks, a second, separate tap confirms. */
export function ConfirmButton({ label, question, confirmLabel, onConfirm }: Props) {
  const [armedAt, setArmedAt] = useState<number | null>(null);

  if (armedAt === null) {
    return (
      <BigButton variant="secondary" className="w-full" onClick={() => setArmedAt(Date.now())}>
        {label}
      </BigButton>
    );
  }

  return (
    <div role="group" aria-label={question} className="flex flex-col gap-2">
      <p className="text-lg font-bold">{question}</p>
      <div className="flex gap-2">
        <BigButton variant="secondary" className="min-h-primary flex-1" onClick={() => setArmedAt(null)}>
          Cancel
        </BigButton>
        <BigButton
          variant="stop"
          className="flex-1"
          onClick={() => {
            if (Date.now() - armedAt < ARM_DELAY_MS) return;
            setArmedAt(null);
            onConfirm();
          }}
        >
          {confirmLabel}
        </BigButton>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { BigButton } from './BigButton';

interface Props {
  label: string;
  question: string;
  confirmLabel: string;
  /** For the most destructive actions: asks a second time before acting. */
  secondQuestion?: string;
  secondConfirmLabel?: string;
  onConfirm: () => void;
}

/** Ignores a confirm tap this soon after arming, so a double tap can't confirm by accident. */
const ARM_DELAY_MS = 500;

/** For destructive actions: the first tap asks, a second, separate tap confirms. */
export function ConfirmButton({ label, question, confirmLabel, secondQuestion, secondConfirmLabel, onConfirm }: Props) {
  const [armed, setArmed] = useState<{ at: number; step: 1 | 2 } | null>(null);

  if (armed === null) {
    return (
      <BigButton variant="secondary" className="w-full" onClick={() => setArmed({ at: Date.now(), step: 1 })}>
        {label}
      </BigButton>
    );
  }

  const second = armed.step === 2;
  const text = second ? secondQuestion! : question;

  return (
    <div role="group" aria-label={text} className="flex flex-col gap-2">
      <p className="text-lg font-bold">{text}</p>
      <div className="flex gap-2">
        <BigButton variant="secondary" size="primary" className="flex-1" onClick={() => setArmed(null)}>
          Cancel
        </BigButton>
        <BigButton
          variant="stop"
          className="flex-1"
          onClick={() => {
            if (Date.now() - armed.at < ARM_DELAY_MS) return;
            if (!second && secondQuestion) return setArmed({ at: Date.now(), step: 2 });
            setArmed(null);
            onConfirm();
          }}
        >
          {second ? (secondConfirmLabel ?? confirmLabel) : confirmLabel}
        </BigButton>
      </div>
    </div>
  );
}

import { BigButton } from './BigButton';

interface Props<T> {
  /** Read out for screen readers; also shown above the buttons unless `hideLabel`. */
  label: string;
  hideLabel?: boolean;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  size?: 'primary' | 'control';
}

/** A row of buttons where one is chosen. The chosen one has a ✓ as well as the colour. */
export function Segmented<T extends string | number | boolean>({
  label,
  hideLabel = false,
  options,
  value,
  onChange,
  size = 'control',
}: Props<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1">
      {!hideLabel && <span className="text-base font-semibold text-muted">{label}</span>}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <BigButton
              key={String(option.value)}
              variant={selected ? 'primary' : 'secondary'}
              size={size}
              aria-pressed={selected}
              className="min-w-[4.5rem] flex-auto whitespace-nowrap px-3"
              onClick={() => onChange(option.value)}
            >
              {selected ? `✓ ${option.label}` : option.label}
            </BigButton>
          );
        })}
      </div>
    </div>
  );
}

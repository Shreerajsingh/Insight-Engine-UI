import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

export function ConfirmButton({
  label,
  confirmLabel,
  busyLabel = 'Working…',
  busy = false,
  disabled = false,
  tone = 'accent',
  className = '',
  onConfirm,
}: {
  label: string;

  confirmLabel: string;
  busyLabel?: string;
  busy?: boolean;
  disabled?: boolean;

  tone?: 'accent' | 'quiet' | 'danger';
  className?: string;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!armed) return;

    const timer = window.setTimeout(() => setArmed(false), 5_000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && armed) {
      event.stopPropagation();
      setArmed(false);
    }
  };

  return (
    <span className={`confirm ${className}`} onKeyDown={onKeyDown}>
      <button
        type="button"
        className={`confirm__act confirm__act--${tone}${armed ? ' confirm__act--armed' : ''}`}
        disabled={disabled || busy}

        aria-label={armed ? confirmLabel : label}
        onClick={() => {
          if (armed) {
            setArmed(false);
            onConfirm();
            return;
          }
          setArmed(true);
        }}
      >
        {busy ? busyLabel : armed ? confirmLabel : label}
      </button>

      {armed && !busy && (
        <button
          ref={cancelRef}
          type="button"
          className="confirm__cancel"
          aria-label="Cancel"
          title="Cancel"
          onClick={() => setArmed(false)}
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </span>
  );
}

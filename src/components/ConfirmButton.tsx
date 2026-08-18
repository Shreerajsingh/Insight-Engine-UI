import { useEffect, useRef, useState } from 'react';

/**
 * A button that asks before it acts.
 *
 * Two clicks on the same button rather than a dialog: the actions guarded here — generating,
 * reprocessing, removing a chart — are each attached to one row or one card, and a modal asking
 * "are you sure?" would take over the page to protect a click, then leave the user to find their
 * place again. Arming in place keeps the question next to the thing it is about.
 *
 * `window.confirm` was the other option. It blocks the page, cannot be themed, and reads as a
 * browser warning rather than as part of this app.
 *
 * Armed state expires on its own after a few seconds. A button left armed is a trap: the next
 * click lands on something the user has stopped thinking about.
 */
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
  /** What the button says once armed — a question, so the second click is an answer. */
  confirmLabel: string;
  busyLabel?: string;
  busy?: boolean;
  disabled?: boolean;
  /** `danger` for anything that destroys something. */
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

  // Escape disarms wherever focus sits inside the pair, which is what a reader expects of a
  // question they have not answered yet.
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
        // Announced as the question once armed, so the state is not carried by colour alone.
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
          ✕
        </button>
      )}
    </span>
  );
}

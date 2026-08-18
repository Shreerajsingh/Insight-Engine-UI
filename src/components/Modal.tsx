import { useEffect, type ReactNode } from 'react';

/**
 * The overlay shell: a backdrop, a panel, and the two behaviours a modal has to get right.
 *
 * Escape closes it, and the page behind it does not scroll while it is open — a modal whose backdrop
 * scrolls feels like two pages fighting. Both are effects with cleanup, which is exactly the kind of
 * thing that goes subtly wrong when it is written twice, so the chart view and the meeting view share
 * this one.
 */
export function Modal({
  label,
  head,
  width = 1100,
  onClose,
  children,
}: {
  /** Names the dialog for assistive tech, since the visible heading varies by use. */
  label: string;
  head: ReactNode;
  width?: number;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      // Only a click that starts on the backdrop closes it. One that began inside the panel and
      // ended out here — a text selection dragged too far — must not.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal__panel" style={{ width: `min(${width}px, 100%)` }}>
        <header className="modal__head">
          {head}
          <button type="button" className="button button--ghost" autoFocus onClick={onClose}>
            Close
          </button>
        </header>

        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}

import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

export function Modal({
  label,
  head,
  width = 1100,
  onClose,
  children,
}: {

  label: string;
  head: ReactNode;
  width?: number;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The panel, not the close button: autoFocus there drew a focus ring on every open.
    panelRef.current?.focus();
  }, []);

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

      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="modal__panel"
        tabIndex={-1}
        style={{ width: `min(${width}px, 100%)` }}
      >
        <header className="modal__head">
          {head}
          <button
            type="button"
            className="iconbutton"
            aria-label="Close"
            title="Close"
            onClick={onClose}
          >
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}

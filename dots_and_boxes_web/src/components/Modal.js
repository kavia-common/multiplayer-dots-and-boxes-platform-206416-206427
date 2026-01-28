import React, { useEffect, useRef } from 'react';
import '../styles/retro.css';

// PUBLIC_INTERFACE
export function Modal({ title, isOpen, onClose, children, footer }) {
  /** Accessible modal dialog with backdrop; closes on Escape and backdrop click. */
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    // focus the panel for keyboard users
    setTimeout(() => panelRef.current?.focus(), 0);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="retro-modalBackdrop" role="presentation" onMouseDown={() => onClose?.()}>
      <div
        className="retro-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panelRef}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="retro-modalHeader">
          <div className="retro-modalTitle">{title}</div>
          <button className="retro-iconBtn" type="button" onClick={() => onClose?.()} aria-label="Close dialog">
            ✕
          </button>
        </div>
        <div className="retro-modalBody">{children}</div>
        {footer ? <div className="retro-modalFooter">{footer}</div> : null}
      </div>
    </div>
  );
}

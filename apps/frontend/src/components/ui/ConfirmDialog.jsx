import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { AlertTriangleIcon } from '../icons/AlertTriangleIcon.jsx';

import { Button } from './Button.jsx';

/**
 * Asks before an irreversible action ("¿Cancelar la reserva de las 7:00?").
 * Say exactly what will happen in `description`, and name the action on the
 * confirm button ("Sí, cancelar reserva") -- never just "Aceptar".
 *
 * Accessible modal: role="alertdialog", focus starts on the SAFE button
 * (cancel), Tab stays inside, Escape cancels, focus returns to whatever
 * opened it. `onConfirm` may be async: the button shows progress and the
 * dialog stays open until it resolves.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'No, volver',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  function onKeyDown(event) {
    if (event.key === 'Escape' && !loading) {
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusables = dialogRef.current.querySelectorAll('button:not([disabled])');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-end justify-center bg-navy-900/60 p-4 sm:items-center">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={onKeyDown}
        className="w-full max-w-lg rounded-xl bg-surface p-6 text-ink shadow-lg md:p-8"
      >
        <div className="flex items-start gap-4">
          {tone === 'danger' && (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
              <AlertTriangleIcon className="h-6 w-6" />
            </span>
          )}
          <div>
            <h2 id={titleId} className="font-display text-h2 font-bold">
              {title}
            </h2>
            <div id={descriptionId} className="mt-2 text-body text-ink-soft">
              {description}
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            loadingText="Un momento…"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { AlertTriangleIcon } from '../icons/AlertTriangleIcon.jsx';
import { DURATION, EASE, motionTransition, useReducedMotion } from '../../lib/motion.js';
import { trapTabKey, useModalPageEffects } from '../../lib/useModal.js';

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
 *
 * Enters with a short fade + rise and leaves slightly faster; instant under
 * prefers-reduced-motion.
 */
export function ConfirmDialog(props) {
  const reduced = useReducedMotion();
  useModalPageEffects(props.open);

  return createPortal(
    <AnimatePresence>
      {props.open && <DialogContent key="confirm-dialog" reduced={reduced} {...props} />}
    </AnimatePresence>,
    document.body,
  );
}

function DialogContent({
  reduced,
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
    cancelRef.current?.focus();
  }, []);

  function onKeyDown(event) {
    if (event.key === 'Escape' && !loading) {
      event.stopPropagation();
      onCancel();
      return;
    }
    trapTabKey(event, dialogRef.current);
  }

  return (
    <motion.div
      className="fixed inset-0 z-modal flex items-end justify-center bg-navy-900/60 p-4 sm:items-center"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={motionTransition(reduced, { duration: DURATION.base })}
    >
      <motion.div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={onKeyDown}
        className="w-full max-w-lg rounded-xl bg-surface p-6 text-ink shadow-lg md:p-8"
        initial={reduced ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={
          reduced
            ? { opacity: 0, transition: { duration: 0 } }
            : { opacity: 0, y: 8, transition: { duration: DURATION.fast, ease: EASE.exit } }
        }
        transition={motionTransition(reduced, { duration: DURATION.slow })}
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
      </motion.div>
    </motion.div>
  );
}

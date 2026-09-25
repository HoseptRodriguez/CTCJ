import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { CloseIcon } from '../icons/CloseIcon.jsx';
import { DURATION, EASE, motionTransition, useReducedMotion } from '../../lib/motion.js';
import { trapTabKey, useModalPageEffects } from '../../lib/useModal.js';

/**
 * Side panel that slides in from the right for a focused task without
 * leaving the page ("Cobrar", "Tu reserva"). Full width on phones.
 *
 * A modal dialog: titled, focus moves inside (to the "Cerrar" button unless
 * `initialFocusRef` is given), Tab stays inside, Escape or the backdrop
 * closes it, and focus returns to the opener. Slides with transform only;
 * appears instantly under reduced motion.
 *
 * @param {{ open: boolean, onClose: () => void, title: string, description?: string,
 *   footer?: import('react').ReactNode, initialFocusRef?: import('react').RefObject<HTMLElement>,
 *   children: import('react').ReactNode }} props
 */
export function SlidePanel(props) {
  const reduced = useReducedMotion();
  useModalPageEffects(props.open);

  return createPortal(
    <AnimatePresence>
      {props.open && <PanelContent key="slide-panel" reduced={reduced} {...props} />}
    </AnimatePresence>,
    document.body,
  );
}

function PanelContent({ reduced, onClose, title, description, footer, initialFocusRef, children }) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    (initialFocusRef?.current ?? closeRef.current)?.focus();
  }, [initialFocusRef]);

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    trapTabKey(event, panelRef.current);
  }

  return (
    <div className="fixed inset-0 z-modal">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-navy-900/60"
        onClick={onClose}
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={motionTransition(reduced, { duration: DURATION.base })}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onKeyDown={onKeyDown}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-surface text-ink shadow-lg"
        initial={reduced ? false : { x: '100%' }}
        animate={{ x: 0 }}
        exit={
          reduced
            ? { x: 0, opacity: 0, transition: { duration: 0 } }
            : { x: '100%', transition: { duration: DURATION.base, ease: EASE.exit } }
        }
        transition={motionTransition(reduced, { duration: DURATION.slow, ease: EASE.entrance })}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line p-5 md:p-6">
          <div>
            <h2 id={titleId} className="font-display text-h2 font-bold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-body text-ink-soft">
                {description}
              </p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="focus-ring inline-flex min-h-btn shrink-0 items-center gap-1 rounded-lg px-3 text-body font-semibold text-navy-500 hover:bg-navy-50"
          >
            <CloseIcon className="h-5 w-5" />
            Cerrar
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 md:p-6">{children}</div>
        {footer && <div className="border-t border-line bg-page p-5 md:p-6">{footer}</div>}
      </motion.div>
    </div>
  );
}

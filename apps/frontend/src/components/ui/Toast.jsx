import { AnimatePresence, motion } from 'framer-motion';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AlertTriangleIcon } from '../icons/AlertTriangleIcon.jsx';
import { CheckCircleIcon } from '../icons/CheckCircleIcon.jsx';
import { CloseIcon } from '../icons/CloseIcon.jsx';
import { InfoIcon } from '../icons/InfoIcon.jsx';
import { DURATION, EASE, motionTransition, useReducedMotion } from '../../lib/motion.js';

import { cn } from './cn.js';

const TONES = {
  success: {
    Icon: CheckCircleIcon,
    className: 'border-status-ok-fg bg-status-ok-bg text-status-ok-fg',
  },
  error: { Icon: AlertTriangleIcon, className: 'border-danger bg-danger-soft text-danger' },
  info: { Icon: InfoIcon, className: 'border-navy-500 bg-navy-50 text-navy-500' },
};

// Adults read slower than the usual 3-4s toast; errors never auto-close.
const SUCCESS_MS = 8000;

const ToastContext = createContext(null);

/**
 * Short confirmations after an action ("Reserva guardada"). Wrap the app
 * once in <ToastProvider>, then `const toast = useToast()` and call
 * `toast({ title, description, tone })`. Success/info close by themselves
 * after 8s; errors stay until the person closes them. Every toast has a
 * visible "Cerrar" button.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(({ title, description, tone = 'success' }) => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((current) => [...current, { id, title, description, tone }]);
    return id;
  }, []);

  const value = useMemo(() => Object.assign(toast, { dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Two live regions: polite for confirmations, assertive for errors. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex flex-col items-center gap-3 p-4 sm:items-end">
        <div aria-live="polite" className="flex w-full flex-col items-center gap-3 sm:items-end">
          <AnimatePresence initial={false}>
            {toasts
              .filter((t) => t.tone !== 'error')
              .map((t) => (
                <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
              ))}
          </AnimatePresence>
        </div>
        <div aria-live="assertive" className="flex w-full flex-col items-center gap-3 sm:items-end">
          <AnimatePresence initial={false}>
            {toasts
              .filter((t) => t.tone === 'error')
              .map((t) => (
                <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
              ))}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const { Icon, className } = TONES[toast.tone] ?? TONES.info;
  const reduced = useReducedMotion();

  useEffect(() => {
    if (toast.tone === 'error') return undefined;
    const timer = setTimeout(() => onDismiss(toast.id), SUCCESS_MS);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    // No role here: the aria-live containers above already exist before a
    // toast arrives, which is what makes screen readers announce it once.
    // Enters rising a little, leaves sideways faster; the rest of the stack
    // slides into place (layout = transform). Instant with reduced motion.
    <motion.div
      layout={!reduced}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={
        reduced
          ? { opacity: 0, transition: { duration: 0 } }
          : { opacity: 0, x: 24, transition: { duration: DURATION.fast, ease: EASE.exit } }
      }
      transition={motionTransition(reduced, { duration: DURATION.base })}
      className={cn(
        'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border-l-8 p-4 shadow-lg',
        className,
      )}
    >
      <Icon className="mt-0.5 h-6 w-6 shrink-0" />
      <div className="flex-1 text-ink">
        <p className="text-body font-bold">{toast.title}</p>
        {toast.description && <p className="mt-1 text-body-sm">{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="focus-ring -m-1 inline-flex min-h-btn shrink-0 items-center gap-1 rounded-lg px-2 text-body-sm font-semibold text-ink hover:bg-black/5"
      >
        <CloseIcon className="h-4 w-4" />
        Cerrar
      </button>
    </motion.div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast() must be used inside <ToastProvider>.');
  }
  return context;
}

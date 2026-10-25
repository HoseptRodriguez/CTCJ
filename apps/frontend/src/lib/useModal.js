import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Page-level side of a modal (ConfirmDialog, SlidePanel): while `open`,
 * lock page scroll and remember what had focus; the moment it closes, give
 * focus back. Runs on `open` changes -- not on unmount -- so focus returns
 * immediately, even while the exit animation is still playing.
 *
 * The two halves deliberately use different effect kinds:
 * - SAVE in useLayoutEffect: the dialog content focuses its own button in a
 *   passive useEffect, and child effects run before parent effects -- a
 *   passive save here would record the dialog's button. Layout effects all
 *   run before any passive effect.
 * - RESTORE in a passive useEffect cleanup: react-dom snapshots the focused
 *   element before each commit and puts focus back on it after the DOM
 *   mutations (restoreSelection) if it's still in the document. During an
 *   exit animation the dialog's button IS still in the document, so a
 *   restore done inside the commit (layout cleanup) gets undone. Passive
 *   cleanups run after the commit, so this one sticks.
 */
export function useModalPageEffects(open) {
  const previouslyFocused = useRef(null);

  useLayoutEffect(() => {
    if (open) previouslyFocused.current = document.activeElement;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
      previouslyFocused.current = null;
    };
  }, [open]);
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab / Shift+Tab cycling inside `container`. Call from onKeyDown. */
export function trapTabKey(event, container) {
  if (event.key !== 'Tab' || !container) return;
  const focusables = container.querySelectorAll(FOCUSABLE);
  if (!focusables.length) return;
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

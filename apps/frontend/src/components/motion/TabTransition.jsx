import { AnimatePresence, motion } from 'framer-motion';

import { DURATION, motionTransition, useReducedMotion } from '../../lib/motion.js';

/**
 * Soft cross-fade (with a 6px rise) when the visible tab changes, so the
 * person notices the content was replaced. The old content leaves first
 * (mode="wait"), so the two never overlap. Pass the active tab's id as
 * `activeKey`. Instant under reduced motion.
 *
 * Use it around the content of a <Tabs> panel:
 *   content: <TabTransition activeKey="pasadas">…</TabTransition>
 */
export function TabTransition({ activeKey, className, children }) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeKey}
        className={className}
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={
          reduced
            ? { opacity: 0, transition: { duration: 0 } }
            : { opacity: 0, transition: { duration: DURATION.fast } }
        }
        transition={motionTransition(reduced, { duration: DURATION.base })}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

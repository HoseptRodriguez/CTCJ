import { AnimatePresence, motion } from 'framer-motion';

import { DURATION, EASE, motionTransition, useReducedMotion } from '../../lib/motion.js';
import { cn } from '../ui/cn.js';

/**
 * List whose items animate when they arrive, leave or change position, so
 * the eye can follow what happened ("the payment moved from Sin pagar to
 * Pagadas"). Items always render in exactly the order given -- animation
 * never changes the order, only how items travel to it.
 *
 * Moving an item BETWEEN two lists: give both lists the same `layoutScope`
 * and wrap them in framer-motion's <LayoutGroup>; the item then slides from
 * its old list to the new one instead of vanishing and reappearing.
 *
 * Layout animations use transform, never width/height/top/left. Under
 * reduced motion, items simply appear and disappear in place.
 *
 * @template T
 * @param {{ items: T[], getKey: (item: T) => string, renderItem: (item: T) => import('react').ReactNode,
 *   as?: 'ul'|'ol', layoutScope?: string, className?: string, itemClassName?: string,
 *   'aria-label'?: string }} props
 */
export function AnimatedList({
  items,
  getKey,
  renderItem,
  as = 'ul',
  layoutScope,
  className,
  itemClassName,
  ...listProps
}) {
  const reduced = useReducedMotion();
  const List = as;

  return (
    <List className={cn('space-y-3', className)} {...listProps}>
      <AnimatePresence initial={false} mode="popLayout">
        {items.map((item) => {
          const key = getKey(item);
          return (
            <motion.li
              key={key}
              data-key={key}
              layout={reduced ? false : 'position'}
              layoutId={layoutScope && !reduced ? `${layoutScope}:${key}` : undefined}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={
                reduced
                  ? { opacity: 0, transition: { duration: 0 } }
                  : { opacity: 0, x: 24, transition: { duration: DURATION.fast, ease: EASE.exit } }
              }
              transition={motionTransition(reduced, { duration: DURATION.slow })}
              className={itemClassName}
            >
              {renderItem(item)}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </List>
  );
}

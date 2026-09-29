import { useId, useState } from 'react';

import { cn } from './cn.js';

/**
 * Accessible accordion (WAI-ARIA disclosure pattern): each question is a
 * real button inside a heading, with aria-expanded and aria-controls; the
 * answer is a labelled region. Works with keyboard (Tab, Enter, Space) and
 * several items may be open at once.
 *
 * @param {{ items: Array<{ question: string, answer: string }>,
 *   headingLevel?: 'h3'|'h4', className?: string }} props
 */
export function Accordion({ items, headingLevel = 'h3', className }) {
  const baseId = useId();
  const [open, setOpen] = useState(() => new Set());
  const Heading = headingLevel;
  const toggle = (i) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className={cn('divide-y divide-line rounded-xl border border-line bg-surface', className)}>
      {items.map((item, i) => {
        const expanded = open.has(i);
        const buttonId = `${baseId}-q${i}`;
        const panelId = `${baseId}-a${i}`;
        return (
          <div key={buttonId}>
            <Heading className="m-0">
              <button
                type="button"
                id={buttonId}
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggle(i)}
                className="focus-ring flex min-h-[3.5rem] w-full items-center justify-between gap-4 px-5 py-4 text-left text-lead font-semibold text-ink"
              >
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'shrink-0 text-h3 leading-none text-navy-500 transition-transform duration-fast motion-reduce:transition-none',
                    expanded && 'rotate-45',
                  )}
                >
                  +
                </span>
              </button>
            </Heading>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!expanded}
              className="px-5 pb-5 text-body text-ink"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}

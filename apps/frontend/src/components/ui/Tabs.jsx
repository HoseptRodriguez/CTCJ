import { useId, useRef, useState } from 'react';

import { cn } from './cn.js';

/**
 * Switches between sections of one page ("Próximas" / "Pasadas").
 * WAI-ARIA tabs: arrow keys move between tabs (and select them), Home/End
 * jump to the ends, only the active tab is in the Tab order.
 * The active tab is lime with bold navy text AND a navy underline, so the
 * selection never depends on color alone.
 *
 * Controlled (`value` + `onChange`) or uncontrolled (`defaultValue`).
 *
 * @param {{ label: string, tabs: {id: string, label: string, content: import('react').ReactNode}[],
 *   value?: string, defaultValue?: string, onChange?: (id: string) => void, className?: string }} props
 */
export function Tabs({ label, tabs, value, defaultValue, onChange, className }) {
  const baseId = useId();
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.id);
  const selected = value ?? internal;
  const tabRefs = useRef({});

  function select(id) {
    if (value === undefined) setInternal(id);
    onChange?.(id);
  }

  function onKeyDown(event) {
    const index = tabs.findIndex((t) => t.id === selected);
    const last = tabs.length - 1;
    const next = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const id = tabs[next].id;
    select(id);
    tabRefs.current[id]?.focus();
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        className="flex flex-wrap gap-2 border-b-2 border-line"
        onKeyDown={onKeyDown}
      >
        {tabs.map((tab) => {
          const isSelected = tab.id === selected;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => select(tab.id)}
              className={cn(
                'focus-ring -mb-0.5 min-h-btn rounded-t-lg border-b-4 px-5 text-body transition-colors duration-fast',
                isSelected
                  ? 'border-navy-500 bg-lime font-bold text-navy-500'
                  : 'border-transparent font-semibold text-ink-soft hover:bg-muted hover:text-ink',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== selected}
          tabIndex={0}
          className="focus-ring rounded-lg pt-6"
        >
          {tab.id === selected && tab.content}
        </div>
      ))}
    </div>
  );
}

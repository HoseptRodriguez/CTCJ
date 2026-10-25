import { InboxIcon } from '../icons/InboxIcon.jsx';

import { cn } from './cn.js';

/**
 * "There's nothing here yet" -- always says why and what to do next.
 * e.g. title="Todavía no tienes reservas", action={<Button to="/canchas">Reservar cancha</Button>}
 */
export function EmptyState({ title, description, action, icon, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-xl border-2 border-dashed border-line bg-surface px-6 py-10 text-center',
        className,
      )}
    >
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-page text-navy-500 [&>svg]:h-7 [&>svg]:w-7">
        {icon ?? <InboxIcon />}
      </span>
      <h2 className="font-display text-h3 font-bold text-ink">{title}</h2>
      {description && <p className="mt-2 max-w-prose text-body text-ink-soft">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

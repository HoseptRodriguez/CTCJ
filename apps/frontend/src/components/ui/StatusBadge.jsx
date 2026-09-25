import { MEMBERSHIP_STATUS } from '@ctcj/shared';

import { AlertTriangleIcon } from '../icons/AlertTriangleIcon.jsx';
import { BanIcon } from '../icons/BanIcon.jsx';
import { CheckCircleIcon } from '../icons/CheckCircleIcon.jsx';
import { ClockIcon } from '../icons/ClockIcon.jsx';

import { cn } from './cn.js';

/**
 * The four states staff and players see for a membership or a payment.
 * Each one has its own text, color AND icon -- never color alone.
 */
export const STATUS_STYLES = {
  'al-dia': {
    label: 'Al día',
    className: 'bg-status-ok-bg text-status-ok-fg',
    Icon: CheckCircleIcon,
  },
  pendiente: {
    label: 'Pendiente',
    className: 'bg-status-pending-bg text-status-pending-fg',
    Icon: ClockIcon,
  },
  vencida: {
    label: 'Vencida',
    className: 'bg-status-overdue-bg text-status-overdue-fg',
    Icon: AlertTriangleIcon,
  },
  suspendida: {
    label: 'Suspendida',
    className: 'bg-status-suspended-bg text-status-suspended-fg',
    Icon: BanIcon,
  },
};

// Backend membership codes (packages/shared MEMBERSHIP_STATUS) -> display state.
const FROM_BACKEND = {
  [MEMBERSHIP_STATUS.ACTIVE]: 'al-dia',
  [MEMBERSHIP_STATUS.PENDING]: 'pendiente',
  [MEMBERSHIP_STATUS.OVERDUE]: 'vencida',
  [MEMBERSHIP_STATUS.SUSPENDED]: 'suspendida',
  [MEMBERSHIP_STATUS.INACTIVE]: 'suspendida',
};

const DEFAULT_LABEL_OVERRIDES = {
  [MEMBERSHIP_STATUS.INACTIVE]: 'Inactiva',
};

/** @returns {keyof typeof STATUS_STYLES | null} */
export function resolveStatus(status) {
  if (status in STATUS_STYLES) return status;
  return FROM_BACKEND[status] ?? null;
}

/**
 * @param {{ status: string, label?: string, size?: 'md'|'lg', className?: string }} props
 *   `status` accepts the display keys ('al-dia', 'pendiente', 'vencida',
 *   'suspendida') or a backend MEMBERSHIP_STATUS code ('ACTIVE', ...).
 *   `label` overrides the text (e.g. "Pagada"), keeping the state's style.
 */
export function StatusBadge({ status, label, size = 'md', className }) {
  const key = resolveStatus(status);
  const style = key ? STATUS_STYLES[key] : null;
  const text = label ?? DEFAULT_LABEL_OVERRIDES[status] ?? style?.label ?? 'Sin estado';
  const Icon = style?.Icon ?? InfoDot;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold',
        size === 'lg' ? 'px-4 py-1.5 text-body' : 'px-3 py-1 text-body-sm',
        style?.className ?? 'bg-status-suspended-bg text-status-suspended-fg',
        className,
      )}
      data-status={key ?? 'desconocido'}
    >
      <Icon className={size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />
      {text}
    </span>
  );
}

function InfoDot(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="5" fill="currentColor" />
    </svg>
  );
}

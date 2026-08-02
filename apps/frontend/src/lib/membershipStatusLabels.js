import { MEMBERSHIP_STATUS } from '@ctcj/shared';

/** Spanish label + badge color per status, shared by every page that displays it. */
export const MEMBERSHIP_STATUS_DISPLAY = {
  [MEMBERSHIP_STATUS.ACTIVE]: {
    label: 'Activo',
    className: 'border-green-200 bg-green-50 text-green-700',
  },
  [MEMBERSHIP_STATUS.PENDING]: {
    label: 'Pendiente',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  [MEMBERSHIP_STATUS.OVERDUE]: {
    label: 'Vencido',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
  [MEMBERSHIP_STATUS.INACTIVE]: {
    label: 'Inactivo',
    className: 'border-neutral-200 bg-neutral-100 text-secondary',
  },
  [MEMBERSHIP_STATUS.SUSPENDED]: {
    label: 'Suspendido',
    className: 'border-red-300 bg-red-100 text-red-800',
  },
};

export function describeMembershipStatus(status) {
  return MEMBERSHIP_STATUS_DISPLAY[status]?.label ?? 'Sin membresía';
}

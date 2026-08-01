import { cn } from '../../components/ui/cn.js';

export const STATUS_LABELS = {
  available: 'Disponible',
  occupied: 'Ocupada',
  mine: 'Tu reserva',
  class: 'Clase',
  tournament: 'Torneo',
  maintenance: 'Mantenimiento',
  blocked: 'Bloqueada',
};

// Tailwind classes generated from the `booking.*` token scale in
// tailwind.config.js -- kept as a static map (not string interpolation) so
// the Tailwind content scanner can see every literal class name it needs to
// generate.
export const STATUS_CLASSES = {
  available:
    'bg-booking-available-fill border-booking-available-border text-booking-available-text',
  occupied: 'bg-booking-occupied-fill border-booking-occupied-border text-booking-occupied-text',
  mine: 'bg-booking-mine-fill border-booking-mine-border text-booking-mine-text',
  class: 'bg-booking-class-fill border-booking-class-border text-booking-class-text',
  tournament:
    'bg-booking-tournament-fill border-booking-tournament-border text-booking-tournament-text',
  maintenance:
    'bg-booking-maintenance-fill border-booking-maintenance-border text-booking-maintenance-text',
  blocked: 'bg-booking-blocked-fill border-booking-blocked-border text-booking-blocked-text',
};

// Every status also carries this text label -- never color alone (see
// tailwind.config.js's comment on the booking.* token scale).
export function SlotCell({ status, onClick }) {
  const isAvailable = status === 'available';
  const label = STATUS_LABELS[status] ?? status;

  return (
    <button
      type="button"
      disabled={!isAvailable}
      onClick={onClick}
      aria-label={isAvailable ? `Reservar, ${label}` : label}
      className={cn(
        'flex h-14 w-full flex-col items-center justify-center rounded-sm border text-[11px] font-medium leading-tight transition-colors duration-fast disabled:cursor-not-allowed',
        STATUS_CLASSES[status] ?? STATUS_CLASSES.occupied,
        isAvailable && 'hover:border-navy-300',
      )}
    >
      {label}
    </button>
  );
}

/** Spanish label per Invoice status (Phase 8's manually-generated charges). */
const LABELS = {
  PENDING: 'Pendiente',
  PAID: 'Pagada',
  CANCELLED: 'Anulada',
};

export function describeInvoiceStatus(status) {
  return LABELS[status] ?? status;
}

function endOfDayExclusive(dateOnly) {
  const d = new Date(dateOnly);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/**
 * Club-wide invoice listing for the financial dashboard (Phase 9), serving
 * two dashboard needs via optional filters rather than two use cases:
 *   - { status: 'PENDING' } -> cartera: everything currently owed.
 *   - { status: 'PAID', paidFrom, paidTo } -> revenue: what was actually
 *     collected in a window (filtered on paidAt, when money was received,
 *     not issuedAt).
 * Every row gets isOverdue computed fresh (never persisted, matching this
 * module's deliberate no-stored-VENCIDO-status design) and, when resolvable,
 * the player's name/email via PlayerDirectoryProvider.
 *
 * @param {{
 *   invoiceRepository: import('../ports/InvoiceRepository.js').InvoiceRepository,
 *   playerDirectoryProvider: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createListInvoices({ invoiceRepository, playerDirectoryProvider, clock }) {
  /**
   * @param {{ status?: string, paidFrom?: string, paidTo?: string }} input paidFrom/paidTo are YYYY-MM-DD
   */
  return async function listInvoices({ status, paidFrom, paidTo } = {}) {
    const filters = {
      status,
      paidFrom: paidFrom ? new Date(paidFrom) : undefined,
      paidTo: paidTo ? endOfDayExclusive(paidTo) : undefined,
    };

    const [invoices, totals] = await Promise.all([
      invoiceRepository.listAll(filters),
      invoiceRepository.getTotals(filters),
    ]);

    const playerIds = [...new Set(invoices.map((invoice) => invoice.playerId))];
    const playerSummaries = await playerDirectoryProvider.getPlayerSummaries(playerIds);

    const now = clock.now();
    const enriched = invoices.map((invoice) => {
      const player = playerSummaries.get(invoice.playerId) ?? null;
      return {
        ...invoice,
        playerFirstName: player?.firstName ?? null,
        playerLastName: player?.lastName ?? null,
        playerEmail: player?.email ?? null,
        isOverdue: invoice.status === 'PENDING' && invoice.dueDate < now,
      };
    });

    return { invoices: enriched, totalCop: totals.totalCop, count: totals.count };
  };
}

/**
 * Manual ("cobro asistido") payment methods only -- no online gateway yet
 * (PSE/Nequi/cards are an unresolved business decision, see docs/adr).
 * CARD_IN_PERSON is deliberately named to be unmistakable: it's a card swiped
 * at the club's own terminal, not an online card payment.
 */
export const PAYMENT_METHOD = Object.freeze({
  CASH: 'CASH',
  TRANSFER: 'TRANSFER',
  CARD_IN_PERSON: 'CARD_IN_PERSON',
});

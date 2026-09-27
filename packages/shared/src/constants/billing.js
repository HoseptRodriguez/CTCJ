/**
 * A player's enrollment lifecycle in a membership plan (Phase 7). Named
 * PLAYER_MEMBERSHIP_STATUS, not MEMBERSHIP_STATUS, to avoid colliding with
 * constants/membership.js's unrelated MEMBERSHIP_STATUS (Phase 5's coarse
 * payment-standing flag on User) -- both happen to include ACTIVE/SUSPENDED
 * but mean completely different things.
 */
export const PLAYER_MEMBERSHIP_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  ENDED: 'ENDED',
});

/**
 * Per-enrollment adjustment types (beca, descuento, recargo, precio
 * personalizado) -- each requires a mandatory reason and an authorizing
 * admin, see billingSchemas.js's addAdjustmentSchema.
 */
export const ADJUSTMENT_TYPE = Object.freeze({
  DISCOUNT_PCT: 'DISCOUNT_PCT',
  DISCOUNT_ABS: 'DISCOUNT_ABS',
  SCHOLARSHIP: 'SCHOLARSHIP',
  SURCHARGE: 'SURCHARGE',
  CUSTOM_PRICE: 'CUSTOM_PRICE',
});

/**
 * Price rules shared by membership plans and courts: whole pesos, above 0,
 * with a sanity ceiling that catches an extra zero typed by mistake.
 */
export const PRICE_LIMITS = Object.freeze({
  MIN_COP: 1,
  MAX_COP: 50_000_000,
});

/**
 * How many days in advance the players of a plan are told about a new price
 * (SystemSetting 'billing.priceChangeNoticeDays'). A change on a plan with
 * active players can't take effect sooner than this; the first price of a
 * plan, or a plan nobody has yet, can apply right away.
 */
export const PRICE_CHANGE_NOTICE_DAYS = Object.freeze({
  DEFAULT: 30,
  MIN: 0,
  MAX: 120,
});

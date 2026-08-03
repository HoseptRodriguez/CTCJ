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

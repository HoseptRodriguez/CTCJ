/** @param {{ billingSettings: import('../ports/BillingSettings.js').BillingSettings }} deps */
export function createGetPriceNoticeDays({ billingSettings }) {
  return async function getPriceNoticeDays() {
    return { days: await billingSettings.getPriceNoticeDays() };
  };
}

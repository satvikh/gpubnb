const PROVIDER_PAYOUT_RATE = parseFloat(process.env.GPUBNB_PROVIDER_PAYOUT_RATE ?? "0.8");

/**
 * Calculate the 80/20 payout split for a completed job.
 */
export function calculatePayout(budgetCents: number) {
  const providerPayoutCents = Math.round(budgetCents * PROVIDER_PAYOUT_RATE);
  const platformFeeCents = budgetCents - providerPayoutCents;
  return { providerPayoutCents, platformFeeCents };
}

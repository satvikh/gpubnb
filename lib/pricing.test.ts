import assert from "node:assert/strict";
import test from "node:test";
import { calculatePayout } from "./pricing";

test("calculatePayout keeps the full job budget accounted for", () => {
  const payout = calculatePayout(701);
  assert.equal(payout.providerPayoutCents + payout.platformFeeCents, 701);
});

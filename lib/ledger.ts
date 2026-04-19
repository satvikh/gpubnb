import type { Types } from "mongoose";
import { LedgerEntry, Provider } from "@/lib/models";

export async function recordCompletedJobLedger(input: {
  jobId: Types.ObjectId | string;
  providerId: Types.ObjectId | string;
  budgetCents: number;
  providerPayoutCents: number;
  platformFeeCents: number;
}) {
  await LedgerEntry.updateOne(
    { jobId: input.jobId, type: "job_charge" },
    {
      $setOnInsert: {
        jobId: input.jobId,
        amountCents: input.budgetCents,
        status: "captured"
      }
    },
    { upsert: true }
  );

  const payout = await LedgerEntry.updateOne(
    { jobId: input.jobId, type: "provider_payout" },
    {
      $setOnInsert: {
        jobId: input.jobId,
        providerId: input.providerId,
        amountCents: input.providerPayoutCents,
        status: "pending"
      }
    },
    { upsert: true }
  );

  await LedgerEntry.updateOne(
    { jobId: input.jobId, type: "platform_fee" },
    {
      $setOnInsert: {
        jobId: input.jobId,
        providerId: input.providerId,
        amountCents: input.platformFeeCents,
        status: "captured"
      }
    },
    { upsert: true }
  );

  if (payout.upsertedCount > 0) {
    await Provider.findByIdAndUpdate(input.providerId, {
      $inc: { totalEarnedCents: input.providerPayoutCents }
    });
  }
}

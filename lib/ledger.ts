import type { Types } from "mongoose";
import { LedgerEntry, Machine } from "@/lib/models";

export async function recordCompletedJobLedger(input: {
  jobId: Types.ObjectId | string;
  machineId: Types.ObjectId | string;
  consumerId?: Types.ObjectId | string;
  budgetCents: number;
  providerPayoutCents: number;
  platformFeeCents: number;
  solanaLamports?: number;
  solanaSignature?: string;
  fromWalletAddress?: string;
  toWalletAddress?: string;
  solanaCentsPerSol?: number;
}) {
  await LedgerEntry.updateOne(
    { jobId: input.jobId, type: "job_charge" },
    {
      $setOnInsert: {
        jobId: input.jobId,
        consumerId: input.consumerId,
        amountCents: input.budgetCents,
        solanaLamports: input.solanaLamports,
        solanaSignature: input.solanaSignature,
        fromWalletAddress: input.fromWalletAddress,
        toWalletAddress: input.toWalletAddress,
        solanaCentsPerSol: input.solanaCentsPerSol,
        status: input.solanaSignature ? "settled" : "captured"
      }
    },
    { upsert: true }
  );

  const payout = await LedgerEntry.updateOne(
    { jobId: input.jobId, type: "provider_payout" },
    {
      $setOnInsert: {
        jobId: input.jobId,
        machineId: input.machineId,
        consumerId: input.consumerId,
        amountCents: input.providerPayoutCents,
        solanaLamports: input.solanaLamports,
        solanaSignature: input.solanaSignature,
        fromWalletAddress: input.fromWalletAddress,
        toWalletAddress: input.toWalletAddress,
        solanaCentsPerSol: input.solanaCentsPerSol,
        status: input.solanaSignature ? "settled" : "pending"
      }
    },
    { upsert: true }
  );

  await LedgerEntry.updateOne(
    { jobId: input.jobId, type: "platform_fee" },
    {
      $setOnInsert: {
        jobId: input.jobId,
        machineId: input.machineId,
        consumerId: input.consumerId,
        amountCents: input.platformFeeCents,
        status: "captured"
      }
    },
    { upsert: true }
  );

  if (payout.upsertedCount > 0) {
    await Machine.findByIdAndUpdate(input.machineId, {
      $inc: { totalEarnedCents: input.providerPayoutCents }
    });
  }
}

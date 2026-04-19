import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import { Consumer, Job, JobEvent, Machine } from "@/lib/models";
import { buildProofHash, calculateSuccessRate, formatJob, getDbUnavailablePayload } from "@/lib/marketplace";
import { calculateRuntimePricing } from "@/lib/pricing";
import { recordCompletedJobLedger } from "@/lib/ledger";
import { requireProvider } from "@/lib/provider-auth";
import {
  SOLANA_CENTS_PER_SOL,
  centsToLamports,
  generateSolanaWallet,
  transferDevnetSol,
} from "@/lib/solana";

const schema = z.object({
  machineId: z.string().min(1).optional(),
  providerId: z.string().min(1).optional(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  result: z.string().optional(),
  exitCode: z.coerce.number().int().optional(),
  message: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const input = schema.parse(await request.json());
    const machineId = input.machineId ?? input.providerId;
    if (!machineId) {
      return NextResponse.json({ error: "machineId is required" }, { status: 400 });
    }

    const auth = await requireProvider(request, machineId);
    if (auth.response) return auth.response;

    const [job, machine] = await Promise.all([
      Job.findOne({ _id: id, machineId }),
      Machine.findById(machineId)
    ]);
    if (!job) {
      return NextResponse.json({ error: "Job not found for machine" }, { status: 404 });
    }
    if (!machine) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 });
    }
    if (job.status === "completed") {
      return NextResponse.json({ job: formatJob(job, machine.name) });
    }
    if (job.status === "failed") {
      return NextResponse.json({ error: "Cannot complete a failed job" }, { status: 409 });
    }

    const completedAt = new Date();
    const stdout = input.stdout ?? input.result ?? job.stdout ?? "";
    const stderr = input.stderr ?? job.stderr ?? "";
    const startedAt = job.startedAt ?? completedAt;
    const runtimeSeconds = Math.max(
      1,
      Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)
    );
    const { jobCostCents } = calculateRuntimePricing({
      runtimeSeconds,
      hourlyRateCents: machine.hourlyRateCents,
      budgetCents: job.budgetCents
    });
    const providerPayoutCents = jobCostCents;
    const platformFeeCents = 0;

    if (!job.consumerId) {
      return NextResponse.json(
        { error: "Job has no consumer wallet attached for Solana payment" },
        { status: 409 }
      );
    }

    const consumer = await Consumer.findById(job.consumerId);
    if (!consumer) {
      return NextResponse.json({ error: "Consumer wallet not found" }, { status: 404 });
    }

    if (!machine.walletAddress || !machine.walletSecretKey) {
      const wallet = generateSolanaWallet();
      machine.walletAddress = wallet.walletAddress;
      machine.walletSecretKey = wallet.walletSecretKey;
      machine.walletNetwork = wallet.walletNetwork;
      await machine.save();
    }

    const solanaPaymentLamports = centsToLamports(jobCostCents);
    let solanaPaymentSignature: string;
    try {
      solanaPaymentSignature = await transferDevnetSol({
        fromSecretKey: consumer.walletSecretKey,
        toWalletAddress: machine.walletAddress,
        lamports: solanaPaymentLamports,
      });
    } catch (error) {
      job.solanaPaymentStatus = "failed";
      job.solanaPaymentLamports = solanaPaymentLamports;
      job.solanaCentsPerSol = SOLANA_CENTS_PER_SOL;
      await job.save();

      const message = error instanceof Error ? error.message : "Solana payment failed";
      return NextResponse.json(
        { error: "Solana devnet payment failed", message },
        { status: 402 }
      );
    }

    job.status = "completed";
    job.startedAt = startedAt;
    job.stdout = stdout;
    job.stderr = stderr;
    job.exitCode = input.exitCode ?? 0;
    job.completedAt = completedAt;
    job.actualRuntimeSeconds = runtimeSeconds;
    job.jobCostCents = jobCostCents;
    job.providerPayoutCents = providerPayoutCents;
    job.platformFeeCents = platformFeeCents;
    job.solanaPaymentLamports = solanaPaymentLamports;
    job.solanaPaymentSignature = solanaPaymentSignature;
    job.solanaPaymentStatus = "settled";
    job.solanaCentsPerSol = SOLANA_CENTS_PER_SOL;
    job.proofHash = buildProofHash(stdout, stderr);
    job.failureReason = undefined;
    job.error = undefined;
    await job.save();

    await recordCompletedJobLedger({
      jobId: job._id,
      machineId: machine._id,
      consumerId: consumer._id,
      budgetCents: jobCostCents,
      providerPayoutCents,
      platformFeeCents,
      solanaLamports: solanaPaymentLamports,
      solanaSignature: solanaPaymentSignature,
      fromWalletAddress: consumer.walletAddress,
      toWalletAddress: machine.walletAddress,
      solanaCentsPerSol: SOLANA_CENTS_PER_SOL
    });

    consumer.totalSpentCents += jobCostCents;
    await consumer.save();

    machine.completedJobs += 1;
    machine.successRate = calculateSuccessRate(machine.completedJobs, machine.failedJobs);
    machine.lastHeartbeatAt = completedAt;
    machine.status = "online";
    await machine.save();

    await JobEvent.create({
      jobId: id,
      machineId,
      type: "completed",
      message: input.message ?? `Machine completed job · checksum ${job.proofHash}`
    });

    return NextResponse.json({ job: formatJob(job, machine.name) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid completion payload", issues: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("MONGODB_URI")) {
      return NextResponse.json(getDbUnavailablePayload(), { status: 503 });
    }
    return NextResponse.json({ error: "Failed to complete job" }, { status: 500 });
  }
}

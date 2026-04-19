import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import { Consumer, Job, JobEvent, Machine } from "@/lib/models";
import { formatJob, getDbUnavailablePayload, listJobsSummary } from "@/lib/marketplace";
import { generateSolanaWallet, requestInitialConsumerAirdrop } from "@/lib/solana";

const schema = z.object({
  title: z.string().min(1),
  type: z.string().optional(),
  machineId: z.string().min(1).optional(),
  providerId: z.string().min(1).optional(),
  consumerId: z.string().min(1).optional(),
  consumerName: z.string().min(1).optional(),
  consumerEmail: z.string().email().optional(),
  source: z.string().min(1).optional(),
  input: z.string().min(1).optional(),
  budgetCents: z.coerce.number().int().positive().optional(),
});

async function resolveMachineId(candidate?: string | null) {
  if (candidate) {
    return candidate;
  }

  const machines = await Machine.find({ status: { $in: ["online", "busy"] } })
    .sort({ lastHeartbeatAt: -1, createdAt: 1 })
    .limit(2)
    .lean();

  if (machines.length === 1) {
    return String(machines[0]._id);
  }

  return null;
}

async function resolveConsumer(input: {
  consumerId?: string;
  consumerName?: string;
  consumerEmail?: string;
}) {
  if (input.consumerId) {
    return Consumer.findById(input.consumerId);
  }

  const wallet = generateSolanaWallet();
  let initialAirdropSignature: string | undefined;
  try {
    initialAirdropSignature = await requestInitialConsumerAirdrop(wallet.walletAddress);
  } catch (error) {
    console.warn("Devnet consumer airdrop failed", error);
  }

  return Consumer.create({
    name: input.consumerName ?? "Guest Consumer",
    email: input.consumerEmail,
    ...wallet,
    initialAirdropSignature,
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobs = await listJobsSummary({
      machineId: searchParams.get("machineId"),
    });
    return NextResponse.json({ jobs });
  } catch (error) {
    if (error instanceof Error && error.message.includes("MONGODB_URI")) {
      return NextResponse.json(getDbUnavailablePayload(), { status: 503 });
    }
    return NextResponse.json({ error: "Failed to load jobs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();

    const contentType = request.headers.get("content-type") ?? "";
    const raw = contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());

    const input = schema.parse(raw);
    const machineId = await resolveMachineId(input.machineId ?? input.providerId ?? null);
    const source = input.source ?? input.input;

    if (!machineId) {
      return NextResponse.json(
        { error: "machineId is required unless exactly one machine is available" },
        { status: 400 }
      );
    }

    if (!source) {
      return NextResponse.json({ error: "source is required" }, { status: 400 });
    }

    const machine = await Machine.findById(machineId);
    if (!machine) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 });
    }

    const consumer = await resolveConsumer({
      consumerId: input.consumerId,
      consumerName: input.consumerName,
      consumerEmail: input.consumerEmail,
    });
    if (!consumer) {
      return NextResponse.json({ error: "Consumer not found" }, { status: 404 });
    }

    const job = await Job.create({
      title: input.title,
      type: input.type ?? "python",
      machineId: machine._id,
      consumerId: consumer._id,
      source,
      budgetCents: input.budgetCents ?? 500,
      status: "queued",
      stdout: "",
      stderr: "",
    });

    await JobEvent.create({
      jobId: job._id,
      machineId: machine._id,
      type: "queued",
      message: `Job queued for ${machine.name}`,
    });

    if (contentType.includes("application/json")) {
      return NextResponse.json({
        job: formatJob(job, machine.name),
        consumer: {
          id: String(consumer._id),
          name: consumer.name,
          walletAddress: consumer.walletAddress,
          walletNetwork: consumer.walletNetwork,
          initialAirdropSignature: consumer.initialAirdropSignature ?? null,
        },
      }, { status: 201 });
    }

    return NextResponse.redirect(new URL(`/jobs/${job._id}/results`, request.url), { status: 303 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid job payload", issues: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("MONGODB_URI")) {
      return NextResponse.json(getDbUnavailablePayload(), { status: 503 });
    }
    throw error;
  }
}

import { Types } from "mongoose";
import dbConnect from "@/lib/db";
import { Job, Machine, User } from "@/lib/models";
import type { SessionUser } from "@/lib/session";

export type ApiUser = SessionUser;
const MARKETPLACE_MACHINE_STALE_MS = 15_000;

export interface ApiMachine {
  id: string;
  producerUserId: string;
  name: string;
  cpu: string;
  gpu: string;
  ramGb: number;
  status: "active" | "inactive" | "busy";
  hourlyRateCents: number;
  totalEarnedCents: number;
  walletAddress: string | null;
  walletNetwork: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiJob {
  id: string;
  consumerUserId: string;
  machineId: string;
  machineName: string | null;
  status: "queued" | "running" | "completed" | "failed";
  code: string;
  filename: string | null;
  timeoutSeconds: number | null;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  budgetCents: number;
  jobCostCents: number | null;
  providerPayoutCents: number | null;
  platformFeeCents: number | null;
  solanaPaymentLamports: number | null;
  solanaPaymentSignature: string | null;
  solanaPaymentStatus: "pending" | "settled" | "failed";
  solanaCentsPerSol: number | null;
  actualRuntimeSeconds: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export function formatMachine(machine: {
  _id: Types.ObjectId | string;
  producerUserId: Types.ObjectId | string;
  name: string;
  cpu: string;
  gpu: string;
  ramGb: number;
  status: "active" | "inactive" | "busy";
  hourlyRateCents?: number;
  totalEarnedCents?: number;
  walletAddress?: string | null;
  walletNetwork?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ApiMachine {
  return {
    id: String(machine._id),
    producerUserId: String(machine.producerUserId),
    name: machine.name,
    cpu: machine.cpu,
    gpu: machine.gpu,
    ramGb: machine.ramGb,
    status: machine.status,
    hourlyRateCents: machine.hourlyRateCents ?? 300,
    totalEarnedCents: machine.totalEarnedCents ?? 0,
    walletAddress: machine.walletAddress ?? null,
    walletNetwork: machine.walletNetwork ?? null,
    createdAt: machine.createdAt.toISOString(),
    updatedAt: machine.updatedAt.toISOString(),
  };
}

export function formatJob(
  job: {
    _id: Types.ObjectId | string;
    consumerUserId: Types.ObjectId | string;
    machineId: Types.ObjectId | string;
    status: "queued" | "running" | "completed" | "failed";
    code: string;
    filename?: string | null;
    timeoutSeconds?: number | null;
    stdout: string;
    stderr: string;
    exitCode: number | null;
    budgetCents?: number | null;
    jobCostCents?: number | null;
    providerPayoutCents?: number | null;
    platformFeeCents?: number | null;
    solanaPaymentLamports?: number | null;
    solanaPaymentSignature?: string | null;
    solanaPaymentStatus?: "pending" | "settled" | "failed";
    solanaCentsPerSol?: number | null;
    actualRuntimeSeconds?: number | null;
    createdAt: Date;
    startedAt?: Date | null;
    completedAt?: Date | null;
    updatedAt: Date;
  },
  machineName?: string | null
): ApiJob {
  return {
    id: String(job._id),
    consumerUserId: String(job.consumerUserId),
    machineId: String(job.machineId),
    machineName: machineName ?? null,
    status: job.status,
    code: job.code,
    filename: job.filename ?? null,
    timeoutSeconds: job.timeoutSeconds ?? null,
    stdout: job.stdout,
    stderr: job.stderr,
    exitCode: job.exitCode,
    budgetCents: job.budgetCents ?? 500,
    jobCostCents: job.jobCostCents ?? null,
    providerPayoutCents: job.providerPayoutCents ?? null,
    platformFeeCents: job.platformFeeCents ?? null,
    solanaPaymentLamports: job.solanaPaymentLamports ?? null,
    solanaPaymentSignature: job.solanaPaymentSignature ?? null,
    solanaPaymentStatus: job.solanaPaymentStatus ?? "pending",
    solanaCentsPerSol: job.solanaCentsPerSol ?? null,
    actualRuntimeSeconds: job.actualRuntimeSeconds ?? null,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    updatedAt: job.updatedAt.toISOString(),
  };
}

export async function listMarketplaceMachines() {
  await dbConnect();
  const staleBefore = new Date(Date.now() - MARKETPLACE_MACHINE_STALE_MS);

  await Machine.updateMany(
    {
      status: { $in: ["active", "busy"] },
      updatedAt: { $lt: staleBefore },
    },
    {
      $set: { status: "inactive" },
    }
  );

  const machines = await Machine.find({
    status: { $in: ["active", "busy"] },
    updatedAt: { $gte: staleBefore },
  })
    .sort({ status: 1, updatedAt: -1 })
    .lean();
  return machines.map(formatMachine);
}

export async function listUserJobs(consumerUserId?: string | null) {
  await dbConnect();
  const filter = consumerUserId ? { consumerUserId } : {};
  const jobs = await Job.find(filter).sort({ createdAt: -1 }).lean();
  const machineIds = [...new Set(jobs.map((job) => String(job.machineId)))];
  const machines = machineIds.length
    ? await Machine.find({ _id: { $in: machineIds } }).lean()
    : [];
  const machineNames = new Map(machines.map((machine) => [String(machine._id), machine.name]));
  return jobs.map((job) => formatJob(job, machineNames.get(String(job.machineId)) ?? null));
}

export async function getJobById(id: string) {
  await dbConnect();
  const job = await Job.findById(id).lean();
  if (!job) {
    return null;
  }
  const machine = await Machine.findById(job.machineId).lean();
  return formatJob(job, machine?.name ?? null);
}

export async function getUserById(id: string) {
  await dbConnect();
  return User.findById(id).lean();
}

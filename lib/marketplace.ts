import crypto from "crypto";
import dbConnect, { isDbConfigured } from "@/lib/db";
import { Job, JobEvent, Machine } from "@/lib/models";

export const HEARTBEAT_STALE_MS = 30_000;

export function calculateSuccessRate(completedJobs: number, failedJobs: number) {
  const total = completedJobs + failedJobs;
  if (total === 0) return 100;
  return Number(((completedJobs / total) * 100).toFixed(1));
}

export function buildProofHash(stdout: string, stderr = "") {
  return crypto
    .createHash("sha256")
    .update(`${stdout}\n---\n${stderr}`)
    .digest("hex")
    .slice(0, 16);
}

export function formatProvider(machine: {
  _id: unknown;
  name: string;
  status: string;
  capabilities: string[];
  hourlyRateCents: number;
  totalEarnedCents: number;
  completedJobs?: number;
  failedJobs?: number;
  successRate?: number;
  lastHeartbeatAt?: Date | null;
  createdAt?: Date | null;
  walletAddress?: string | null;
  walletNetwork?: string | null;
}) {
  const id = String(machine._id);

  return {
    id,
    machineId: id,
    name: machine.name,
    machineName: machine.name,
    status: machine.status,
    capabilities: machine.capabilities,
    hourlyRateCents: machine.hourlyRateCents,
    totalEarnedCents: machine.totalEarnedCents,
    completedJobs: machine.completedJobs ?? 0,
    failedJobs: machine.failedJobs ?? 0,
    successRate:
      machine.successRate ??
      calculateSuccessRate(machine.completedJobs ?? 0, machine.failedJobs ?? 0),
    lastHeartbeatAt: machine.lastHeartbeatAt ?? null,
    createdAt: machine.createdAt ?? null,
    walletAddress: machine.walletAddress ?? null,
    walletNetwork: machine.walletNetwork ?? null,
  };
}

export const formatMachine = formatProvider;

export function formatJob(
  job: {
    _id: unknown;
    title: string;
    type?: string | null;
    status: string;
    machineId: unknown;
    consumerId?: unknown;
    source: string;
    stdout?: string | null;
    stderr?: string | null;
    exitCode?: number | null;
    budgetCents: number;
    jobCostCents?: number | null;
    providerPayoutCents?: number | null;
    platformFeeCents?: number | null;
    solanaPaymentLamports?: number | null;
    solanaPaymentSignature?: string | null;
    solanaPaymentStatus?: string | null;
    solanaCentsPerSol?: number | null;
    startedAt?: Date | null;
    completedAt?: Date | null;
    actualRuntimeSeconds?: number | null;
    proofHash?: string | null;
    failureReason?: string | null;
    error?: string | null;
    createdAt?: Date | null;
    updatedAt?: Date | null;
  },
  machineName?: string | null
) {
  const machineId = String(job.machineId);
  const stdout = job.stdout ?? "";
  const stderr = job.stderr ?? "";

  return {
    id: String(job._id),
    title: job.title,
    type: job.type ?? "python",
    status: job.status,
    machineId,
    consumerId: job.consumerId ? String(job.consumerId) : null,
    machineName: machineName ?? null,
    assignedProviderId: machineId,
    assignedProviderName: machineName ?? null,
    requiredCapabilities: [],
    runnerPayload: machineName
      ? { selectedProviderName: machineName }
      : null,
    source: job.source,
    input: job.source,
    stdout,
    stderr,
    exitCode: job.exitCode ?? null,
    result: stdout || null,
    error: stderr || job.error || null,
    failureReason: job.failureReason ?? (stderr || null),
    budgetCents: job.budgetCents,
    retryCount: 0,
    startedAt: job.startedAt ?? null,
    completedAt: job.completedAt ?? null,
    actualRuntimeSeconds: job.actualRuntimeSeconds ?? null,
    jobCostCents: job.jobCostCents ?? null,
    providerPayoutCents: job.providerPayoutCents ?? null,
    platformFeeCents: job.platformFeeCents ?? null,
    solanaPaymentLamports: job.solanaPaymentLamports ?? null,
    solanaPaymentSignature: job.solanaPaymentSignature ?? null,
    solanaPaymentStatus: job.solanaPaymentStatus ?? null,
    solanaCentsPerSol: job.solanaCentsPerSol ?? null,
    proofHash: job.proofHash ?? null,
    createdAt: job.createdAt ?? null,
    updatedAt: job.updatedAt ?? null,
  };
}

async function getMachineNameLookup(ids: string[]) {
  const machines = ids.length
    ? await Machine.find({ _id: { $in: ids } }).lean()
    : [];

  return new Map(machines.map((machine) => [String(machine._id), machine.name]));
}

export async function getDashboardSummary() {
  await dbConnect();

  const [machines, recentJobs, recentActivity, completedTotals] = await Promise.all([
    Machine.find().sort({ status: 1, totalEarnedCents: -1, createdAt: 1 }).lean(),
    Job.find().sort({ createdAt: -1 }).limit(8).lean(),
    JobEvent.find().sort({ createdAt: -1 }).limit(12).lean(),
    Job.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: null,
          totalProviderPayoutCents: { $sum: { $ifNull: ["$providerPayoutCents", 0] } },
          totalPlatformFeeCents: { $sum: { $ifNull: ["$platformFeeCents", 0] } },
        },
      },
    ]),
  ]);

  const machineIds = Array.from(
    new Set([
      ...recentJobs.map((job) => String(job.machineId)),
      ...recentActivity.map((event) => event.machineId?.toString()).filter(Boolean),
    ])
  ) as string[];

  const machineLookup = await getMachineNameLookup(machineIds);
  const machineSummary = machines.map(formatMachine);
  const jobSummary = recentJobs.map((job) =>
    formatJob(job, machineLookup.get(String(job.machineId)) ?? null)
  );
  const totals = completedTotals[0] ?? {
    totalProviderPayoutCents: 0,
    totalPlatformFeeCents: 0,
  };

  const providerCounts = {
    online: machineSummary.filter((machine) => machine.status === "online").length,
    busy: machineSummary.filter((machine) => machine.status === "busy").length,
    offline: machineSummary.filter((machine) => machine.status === "offline").length,
  };

  const jobCounts = {
    queued: await Job.countDocuments({ status: "queued" }),
    assigned: 0,
    running: await Job.countDocuments({ status: "running" }),
    completed: await Job.countDocuments({ status: "completed" }),
    failed: await Job.countDocuments({ status: "failed" }),
  };

  return {
    providerCounts,
    machineCounts: providerCounts,
    jobCounts,
    totalProviderPayoutCents: totals.totalProviderPayoutCents,
    totalPlatformFeeCents: totals.totalPlatformFeeCents,
    recentJobs: jobSummary,
    recentActivity: recentActivity.map((event) => ({
      id: String(event._id),
      jobId: String(event.jobId),
      machineId: event.machineId ? String(event.machineId) : null,
      machineName: event.machineId
        ? machineLookup.get(String(event.machineId)) ?? null
        : null,
      providerId: event.machineId ? String(event.machineId) : null,
      providerName: event.machineId
        ? machineLookup.get(String(event.machineId)) ?? null
        : null,
      type: event.type,
      message: event.message,
      createdAt: event.createdAt,
    })),
    providers: machineSummary,
    machines: machineSummary,
  };
}

export async function listProvidersSummary() {
  await dbConnect();
  const machines = await Machine.find().sort({ status: 1, totalEarnedCents: -1, name: 1 }).lean();
  return machines.map(formatMachine);
}

export const listMachinesSummary = listProvidersSummary;

export async function listJobsSummary(input?: { machineId?: string | null }) {
  await dbConnect();

  const filter = input?.machineId ? { machineId: input.machineId } : {};
  const jobs = await Job.find(filter).sort({ createdAt: -1 }).lean();
  const machineIds = Array.from(new Set(jobs.map((job) => String(job.machineId))));
  const machineLookup = await getMachineNameLookup(machineIds);

  return jobs.map((job) =>
    formatJob(job, machineLookup.get(String(job.machineId)) ?? null)
  );
}

export async function getJobDetail(id: string) {
  await dbConnect();

  const job = await Job.findById(id).lean();
  if (!job) {
    return null;
  }

  const machineLookup = await getMachineNameLookup([String(job.machineId)]);
  const events = await JobEvent.find({ jobId: id }).sort({ createdAt: -1 }).lean();
  const eventMachineIds = Array.from(
    new Set(events.map((event) => event.machineId?.toString()).filter(Boolean))
  ) as string[];
  const eventMachineLookup = await getMachineNameLookup(eventMachineIds);

  return {
    job: formatJob(job, machineLookup.get(String(job.machineId)) ?? null),
    events: events.map((event) => ({
      id: String(event._id),
      jobId: String(event.jobId),
      machineId: event.machineId ? String(event.machineId) : null,
      machineName: event.machineId
        ? eventMachineLookup.get(String(event.machineId)) ?? null
        : null,
      providerId: event.machineId ? String(event.machineId) : null,
      providerName: event.machineId
        ? eventMachineLookup.get(String(event.machineId)) ?? null
        : null,
      type: event.type,
      message: event.message,
      createdAt: event.createdAt,
    })),
  };
}

export function getDbUnavailablePayload() {
  return {
    error: "Database unavailable",
    configured: isDbConfigured(),
  };
}

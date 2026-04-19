export type JobStatus = string;

export type JobType = "python";

export type MachineStatus = string;
export type ProviderStatus = MachineStatus;

export interface Machine {
  id: string;
  machineId?: string;
  name: string;
  machineName?: string;
  status: MachineStatus;
  capabilities: string[];
  hourlyRateCents: number;
  totalEarnedCents: number;
  completedJobs?: number;
  failedJobs?: number;
  successRate?: number;
  lastHeartbeatAt?: string;
  token?: string;
  walletAddress?: string | null;
  walletNetwork?: string | null;
  createdAt: string;
}

export type Provider = Machine;

export interface Job {
  id: string;
  title: string;
  type: string;
  status: JobStatus;
  machineId: string;
  consumerId?: string | null;
  machineName?: string | null;
  assignedProviderId?: string | null;
  assignedProviderName?: string | null;
  requiredCapabilities?: string[];
  runnerPayload?: Record<string, unknown> | null;
  source: string;
  input: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  result?: string | null;
  error?: string | null;
  failureReason?: string | null;
  budgetCents: number;
  jobCostCents?: number | null;
  providerPayoutCents?: number | null;
  platformFeeCents?: number | null;
  solanaPaymentLamports?: number | null;
  solanaPaymentSignature?: string | null;
  solanaPaymentStatus?: string | null;
  solanaCentsPerSol?: number | null;
  proofHash?: string | null;
  retryCount?: number;
  startedAt?: string;
  completedAt?: string;
  actualRuntimeSeconds?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  jobId: string;
  providerId: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface JobEvent {
  id: string;
  jobId: string;
  machineId?: string;
  providerId?: string;
  machineName?: string;
  providerName?: string;
  type: string;
  message: string;
  createdAt: string;
}

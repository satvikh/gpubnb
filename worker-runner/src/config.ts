import "dotenv/config";
import path from "node:path";

export interface RunnerConfig {
  port: number;
  pollEnabled: boolean;
  apiBaseUrl: string;
  providerId: string;
  providerToken?: string;
  pollIntervalMs: number;
  workspaceRoot: string;
  artifactRoot: string;
  defaultTimeoutMs: number;
  maxLogBytes: number;
  orphanCleanupIntervalMs: number;
  containerLabelPrefix: string;
  allowCustomCommands: boolean;
}

function bool(value: string | undefined, fallback: boolean) {
  if (value == null) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function int(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadConfig(): RunnerConfig {
  return {
    port: int(process.env.PORT, 4317),
    pollEnabled: bool(process.env.POLL_ENABLED, false),
    apiBaseUrl: process.env.API_BASE_URL ?? "http://localhost:3000",
    providerId: process.env.PROVIDER_ID ?? "local-demo-provider",
    providerToken: process.env.PROVIDER_TOKEN || undefined,
    pollIntervalMs: int(process.env.POLL_INTERVAL_MS, 5000),
    workspaceRoot: path.resolve(process.env.WORKSPACE_ROOT ?? "./workspaces"),
    artifactRoot: path.resolve(process.env.ARTIFACT_ROOT ?? "./artifacts"),
    defaultTimeoutMs: int(process.env.DEFAULT_TIMEOUT_MS, 30000),
    maxLogBytes: int(process.env.MAX_LOG_BYTES, 64 * 1024),
    orphanCleanupIntervalMs: int(process.env.ORPHAN_CLEANUP_INTERVAL_MS, 60000),
    containerLabelPrefix: process.env.CONTAINER_LABEL_PREFIX ?? "computebnb.worker-runner",
    allowCustomCommands: bool(process.env.ALLOW_CUSTOM_COMMANDS, false)
  };
}

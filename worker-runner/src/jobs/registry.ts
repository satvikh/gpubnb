import { nanoid } from "nanoid";
import { z } from "zod";
import type { JobLimits, JobRecord, JobRequest, NormalizedJob } from "../types.js";

const DEFAULT_IMAGES = {
  python_script: "python:3.12-slim",
  inference: "computebnb/python-runner:local",
  benchmark_demo: "computebnb/python-runner:local"
} as const;

export const APPROVED_IMAGES = new Set<string>([
  "computebnb/python-runner:local",
  "python:3.12-slim"
]);

const schema = z.object({
  id: z.string().min(1).optional(),
  type: z.enum(["python_script", "inference", "benchmark_demo"]),
  image: z.string().min(1).optional(),
  command: z.array(z.string()).min(1).optional(),
  script: z.string().max(32_000).optional(),
  input: z.record(z.unknown()).optional(),
  limits: z
    .object({
      timeoutMs: z.number().int().min(1000).max(10 * 60_000).optional(),
      cpus: z.number().positive().max(8).optional(),
      memoryMb: z.number().int().min(64).max(8192).optional(),
      pidsLimit: z.number().int().min(16).max(512).optional(),
      logLimitBytes: z.number().int().min(1024).max(1024 * 1024).optional()
    })
    .optional()
});

export function parseJobRequest(body: unknown): JobRequest {
  return schema.parse(body);
}

export function normalizeJob(
  request: JobRequest,
  defaults: Pick<JobLimits, "timeoutMs" | "logLimitBytes"> & { allowCustomCommands?: boolean }
): NormalizedJob {
  const id = request.id ?? `job_${nanoid(10)}`;
  const image = request.image ?? DEFAULT_IMAGES[request.type];

  if (!APPROVED_IMAGES.has(image)) {
    throw new Error(`Image is not approved for this runner: ${image}`);
  }

  const limits: JobLimits = {
    timeoutMs: request.limits?.timeoutMs ?? defaults.timeoutMs,
    cpus: request.limits?.cpus ?? 1,
    memoryMb: request.limits?.memoryMb ?? 512,
    pidsLimit: request.limits?.pidsLimit ?? 128,
    logLimitBytes: request.limits?.logLimitBytes ?? defaults.logLimitBytes
  };

  return {
    id,
    type: request.type,
    image,
    command: defaults.allowCustomCommands && request.command ? request.command : defaultCommand(request),
    script: request.script,
    input: request.input,
    limits
  };
}

export function toJobRecord(job: NormalizedJob): JobRecord {
  const now = new Date().toISOString();
  return {
    id: job.id,
    type: job.type,
    image: job.image,
    command: job.command,
    state: "queued",
    createdAt: now,
    updatedAt: now,
    logs: {
      stdout: "",
      stderr: "",
      truncated: false
    }
  };
}

function defaultCommand(request: JobRequest): string[] {
  if (request.type === "python_script") {
    return ["python", "/workspace/job.py"];
  }

  if (request.type === "inference") {
    return ["python", "/opt/runner/inference.py", "/workspace/input.json"];
  }

  return ["python", "/opt/runner/benchmark.py", "/workspace/input.json"];
}

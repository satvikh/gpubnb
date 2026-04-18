import type { Assignment, Job, JobEvent, JobStatus, JobType, Provider } from "@/lib/types";

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

interface DemoState {
  providers: Map<string, Provider>;
  jobs: Map<string, Job>;
  assignments: Map<string, Assignment>;
  events: JobEvent[];
  seeded: boolean;
}

const globalForStore = globalThis as typeof globalThis & {
  __gpubnbDemoState?: DemoState;
};

const state =
  globalForStore.__gpubnbDemoState ??
  (globalForStore.__gpubnbDemoState = {
    providers: new Map<string, Provider>(),
    jobs: new Map<string, Job>(),
    assignments: new Map<string, Assignment>(),
    events: [],
    seeded: false
  });

const { providers, jobs, assignments, events } = state;

function addEvent(jobId: string, type: JobEvent["type"], message: string, providerId?: string) {
  events.unshift({
    id: id("evt"),
    jobId,
    providerId,
    type,
    message,
    createdAt: now()
  });
}

export const store = {
  listProviders() {
    return Array.from(providers.values());
  },

  listJobs() {
    return Array.from(jobs.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  listEvents(jobId: string) {
    return events.filter((event) => event.jobId === jobId);
  },

  registerProvider(input: { name: string; capabilities?: string[]; hourlyRateCents?: number }) {
    const provider: Provider = {
      id: id("prv"),
      token: id("tok"),
      name: input.name,
      capabilities: input.capabilities ?? ["cpu", "node"],
      hourlyRateCents: input.hourlyRateCents ?? 250,
      totalEarnedCents: 0,
      status: "online",
      lastHeartbeatAt: now(),
      createdAt: now()
    };

    providers.set(provider.id, provider);
    return provider;
  },

  heartbeat(providerId: string) {
    const provider = providers.get(providerId);
    if (!provider) return null;
    provider.status = provider.status === "busy" ? "busy" : "online";
    provider.lastHeartbeatAt = now();
    providers.set(provider.id, provider);
    return provider;
  },

  createJob(input: { title: string; type: JobType; input: string; budgetCents?: number }) {
    const createdAt = now();
    const job: Job = {
      id: id("job"),
      title: input.title,
      type: input.type,
      status: "queued",
      input: input.input,
      budgetCents: input.budgetCents ?? 500,
      createdAt,
      updatedAt: createdAt
    };

    jobs.set(job.id, job);
    addEvent(job.id, "created", "Job queued from web app");
    this.assignNextJob();
    return job;
  },

  getJob(jobId: string) {
    return jobs.get(jobId) ?? null;
  },

  getAssignmentForProvider(providerId: string) {
    return Array.from(assignments.values()).find(
      (assignment) =>
        assignment.providerId === providerId &&
        (assignment.status === "assigned" || assignment.status === "running")
    ) ?? null;
  },

  reportProgress(jobId: string, input: { providerId?: string; message: string }) {
    const job = jobs.get(jobId);
    if (!job) return null;
    job.status = "running";
    job.updatedAt = now();
    jobs.set(job.id, job);
    addEvent(job.id, "progress", input.message, input.providerId);
    return job;
  },

  assignNextJob() {
    // TODO: Replace this with MongoDB-backed scheduling and capability matching.
    const provider = Array.from(providers.values()).find((item) => item.status === "online");
    const job = Array.from(jobs.values()).find((item) => item.status === "queued");
    if (!provider || !job) return null;

    const assignment: Assignment = {
      id: id("asg"),
      jobId: job.id,
      providerId: provider.id,
      status: "assigned",
      createdAt: now()
    };

    job.status = "assigned";
    job.updatedAt = now();
    provider.status = "busy";
    assignments.set(assignment.id, assignment);
    jobs.set(job.id, job);
    providers.set(provider.id, provider);
    addEvent(job.id, "assigned", `Assigned to ${provider.name}`, provider.id);
    return assignment;
  },

  updateJob(jobId: string, status: JobStatus, input: { providerId?: string; result?: string; error?: string; message?: string }) {
    const job = jobs.get(jobId);
    if (!job) return null;

    job.status = status;
    job.updatedAt = now();
    if (input.result) job.result = input.result;
    if (input.error) job.error = input.error;

    const assignment = Array.from(assignments.values()).find((item) => item.jobId === jobId);
    if (assignment) {
      assignment.status = status;
      if (status === "running") assignment.startedAt = now();
      if (status === "completed" || status === "failed") assignment.completedAt = now();
      assignments.set(assignment.id, assignment);
    }

    if (status === "completed") {
      job.providerPayoutCents = Math.round(job.budgetCents * 0.8);
      job.platformFeeCents = job.budgetCents - job.providerPayoutCents;
    }

    if ((status === "completed" || status === "failed") && assignment) {
      const provider = providers.get(assignment.providerId);
      if (provider) {
        provider.status = "online";
        if (status === "completed") provider.totalEarnedCents += job.providerPayoutCents ?? 0;
        providers.set(provider.id, provider);
      }
    }

    const eventType =
      status === "running" ? "started" :
      status === "queued" ? "created" :
      status;

    jobs.set(job.id, job);
    addEvent(job.id, eventType, input.message ?? `Job ${status}`, input.providerId);
    this.assignNextJob();
    return job;
  }
};

if (!state.seeded) {
  state.seeded = true;
  store.registerProvider({
    name: "Sample M2 Laptop",
    capabilities: ["cpu", "node", "lightweight-ai"],
    hourlyRateCents: 300
  });

  store.createJob({
    title: "Summarize launch notes",
    type: "text_generation",
    input: "Summarize these hackathon launch notes into three bullets.",
    budgetCents: 700
  });
}

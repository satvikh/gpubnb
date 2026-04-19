import { Provider, Job, Assignment, JobEvent } from "@/lib/models";
import type { IAssignment } from "@/lib/models";

const HEARTBEAT_STALE_MS = 30_000; // 30 seconds

/**
 * Simple hackathon scheduler: pick the first compatible idle provider
 * with a recent heartbeat and assign the first queued job.
 *
 * Uses atomic findOneAndUpdate calls to avoid double-assigning.
 */
export async function assignNextJob(): Promise<IAssignment | null> {
  // 1. Find the first queued job
  const job = await Job.findOne({ status: "queued" }).sort({ createdAt: 1 });
  if (!job) return null;

  // 2. Find a compatible idle provider with a recent heartbeat
  const heartbeatCutoff = new Date(Date.now() - HEARTBEAT_STALE_MS);
  const provider = await Provider.findOneAndUpdate(
    {
      status: "online",
      lastHeartbeatAt: { $gte: heartbeatCutoff },
      capabilities: { $all: job.requiredCapabilities ?? [] },
    },
    { $set: { status: "busy" } },
    { new: true }
  );
  if (!provider) return null;

  // 3. Atomically claim the job so no other scheduler picks it
  const claimed = await Job.findOneAndUpdate(
    { _id: job._id, status: "queued" },
    { $set: { status: "assigned" } },
    { new: true }
  );
  if (!claimed) {
    // Another request claimed it — roll back provider status
    await Provider.findByIdAndUpdate(provider._id, { status: "online" });
    return null;
  }

  // 4. Create the assignment
  const assignment = await Assignment.create({
    jobId: claimed._id,
    providerId: provider._id,
    status: "assigned",
  }).catch(async () => {
    await Job.findByIdAndUpdate(claimed._id, { status: "queued" });
    await Provider.findByIdAndUpdate(provider._id, { status: "online" });
    throw error;
  });

  // 5. Log the event
  await JobEvent.create({
    jobId: claimed._id,
    providerId: provider._id,
    type: "assigned",
    message: `Assigned to ${provider.name}`,
  });

  return assignment;
}

/**
 * Return the active assignment (assigned | running) for a given provider.
 */
export async function getAssignmentForProvider(providerId: string) {
  return Assignment.findOne({
    providerId,
    status: { $in: ["assigned", "running"] },
  });
}

export async function markStaleProvidersOffline() {
  const heartbeatCutoff = new Date(Date.now() - HEARTBEAT_STALE_MS);
  return Provider.updateMany(
    {
      status: "online",
      lastHeartbeatAt: { $lt: heartbeatCutoff }
    },
    { $set: { status: "offline" } }
  );
}

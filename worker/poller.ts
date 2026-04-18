import { markComplete, markFailed, markStarted, pollForJob, reportProgress } from "./api";
import { executeJob } from "./executor";
import type { WorkerConfig } from "./config";

let busy = false;

export function startPoller(config: WorkerConfig, providerId: string) {
  const tick = async () => {
    if (busy) return;
    let activeJobId: string | null = null;

    try {
      const { job } = await pollForJob(config, providerId);
      if (!job) {
        console.log("poll: no job");
        return;
      }

      busy = true;
      activeJobId = job.id;
      console.log(`poll: assigned ${job.id}`);
      await markStarted(config, providerId, job.id);
      const result = await executeJob(job, (message) =>
        reportProgress(config, providerId, job.id, message).then(() => console.log(`progress: ${message}`))
      );
      await markComplete(config, providerId, job.id, result);
      console.log(`complete: ${job.id}`);
    } catch (error) {
      console.error("poller failed:", error);
      if (activeJobId) {
        await markFailed(config, providerId, activeJobId, error instanceof Error ? error.message : "Unknown worker error");
      }
    } finally {
      busy = false;
    }
  };

  void tick();
  return setInterval(tick, config.pollIntervalMs);
}

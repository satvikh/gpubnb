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
        console.log("Poll: no job");
        return;
      }

      busy = true;
      activeJobId = job.id;
      console.log(`Poll: assigned ${job.id} (${job.type})`);
      await markStarted(config, providerId, job.id);
      const result = await executeJob(config, job, (message) =>
        reportProgress(config, providerId, job.id, message).then(() => console.log(`Progress: ${message}`))
      );
      await markComplete(config, providerId, job.id, result);
      console.log(`Complete: ${job.id}`);
    } catch (error) {
      console.error("Poller failed:", error instanceof Error ? error.message : error);
      if (activeJobId) {
        try {
          await markFailed(config, providerId, activeJobId, error instanceof Error ? error.message : "Unknown worker error");
        } catch (reportError) {
          console.error("Failed to report job failure:", reportError instanceof Error ? reportError.message : reportError);
        }
      }
    } finally {
      busy = false;
    }
  };

  void tick();
  return setInterval(tick, config.pollIntervalMs);
}

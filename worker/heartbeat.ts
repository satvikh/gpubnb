import { sendHeartbeat } from "./api";
import type { WorkerConfig } from "./config";

export function startHeartbeat(config: WorkerConfig, providerId: string) {
  const tick = async () => {
    try {
      await sendHeartbeat(config, providerId);
      console.log("Heartbeat: online");
    } catch (error) {
      console.error("Heartbeat failed:", error instanceof Error ? error.message : error);
    }
  };

  void tick();
  return setInterval(tick, config.heartbeatIntervalMs);
}

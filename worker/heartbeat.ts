import { sendHeartbeat } from "./api";
import type { WorkerConfig } from "./config";

export function startHeartbeat(config: WorkerConfig, providerId: string) {
  const tick = async () => {
    try {
      await sendHeartbeat(config, providerId);
      console.log("heartbeat: online");
    } catch (error) {
      console.error("heartbeat failed:", error);
    }
  };

  void tick();
  return setInterval(tick, config.heartbeatIntervalMs);
}

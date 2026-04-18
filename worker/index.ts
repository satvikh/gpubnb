import { getConfig } from "./config";
import { startHeartbeat } from "./heartbeat";
import { startPoller } from "./poller";
import { ensureRegistered } from "./register";

async function main() {
  const baseConfig = getConfig();
  console.log(`GPUbnb worker connecting to ${baseConfig.apiUrl}`);

  const registration = await ensureRegistered(baseConfig);
  const config = {
    ...baseConfig,
    providerId: registration.providerId,
    providerToken: registration.providerToken
  };

  const heartbeat = startHeartbeat(config, registration.providerId);
  const poller = startPoller(config, registration.providerId);

  console.log(`GPUbnb worker running as ${registration.providerId}. Press Ctrl+C to stop.`);

  const shutdown = () => {
    console.log("Stopping GPUbnb worker...");
    clearInterval(heartbeat);
    clearInterval(poller);
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

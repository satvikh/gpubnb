import { getConfig } from "./config";
import { startHeartbeat } from "./heartbeat";
import { startPoller } from "./poller";
import { ensureRegistered } from "./register";

async function main() {
  const baseConfig = getConfig();
  const registration = await ensureRegistered(baseConfig);
  const config = {
    ...baseConfig,
    providerId: registration.providerId,
    providerToken: registration.providerToken
  };

  startHeartbeat(config, registration.providerId);
  startPoller(config, registration.providerId);

  console.log("GPUbnb worker running. Press Ctrl+C to stop.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

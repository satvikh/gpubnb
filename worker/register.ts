import { registerProvider } from "./api";
import type { WorkerConfig } from "./config";

export async function ensureRegistered(config: WorkerConfig) {
  if (config.providerId) {
    console.log(`Using provider ${config.providerId}`);
    return { providerId: config.providerId, providerToken: config.providerToken };
  }

  const { provider } = await registerProvider(config);
  console.log(`Registered ${provider.name}`);
  console.log(`Provider id: ${provider.id}`);
  console.log("Set GPUBNB_PROVIDER_ID and GPUBNB_PROVIDER_TOKEN for a stable provider identity.");

  return {
    providerId: provider.id,
    providerToken: provider.token
  };
}

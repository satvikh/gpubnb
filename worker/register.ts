import { registerProvider } from "./api";
import type { WorkerConfig } from "./config";

export async function ensureRegistered(config: WorkerConfig) {
  if (config.providerId) {
    console.log(`using provider: ${config.providerId}`);
    return { providerId: config.providerId, providerToken: config.providerToken };
  }

  const { provider } = await registerProvider(config);
  console.log(`registered: ${provider.name}`);
  console.log(`provider id: ${provider.id}`);
  console.log("add GPUBNB_PROVIDER_ID and GPUBNB_PROVIDER_TOKEN to .env for stable identity");

  return {
    providerId: provider.id,
    providerToken: provider.token
  };
}

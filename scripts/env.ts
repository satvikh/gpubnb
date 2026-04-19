import { existsSync } from "node:fs";
import process from "node:process";

export function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    if (existsSync(file)) {
      process.loadEnvFile(file);
    }
  }
}

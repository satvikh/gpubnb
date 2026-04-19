import express from "express";
import type { RunnerConfig } from "../config.js";
import type { Executor } from "../types.js";
import type { RunnerService } from "../jobs/runner-service.js";
import { installRoutes } from "./routes.js";

export function createServer(config: RunnerConfig, service: RunnerService, executor: Executor) {
  const app = express();
  app.use((request, response, next) => {
    response.setHeader("access-control-allow-origin", "*");
    response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
    response.setHeader("access-control-allow-headers", "authorization,content-type");
    if (request.method === "OPTIONS") {
      response.sendStatus(204);
      return;
    }
    next();
  });
  app.use(express.json({ limit: "1mb" }));
  installRoutes(app, service, executor);

  return {
    app,
    listen() {
      return app.listen(config.port, () => {
        console.log(`[worker-runner] listening on http://localhost:${config.port}`);
      });
    }
  };
}

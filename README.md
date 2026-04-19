# ComputeBNB

ComputeBNB is an MVP marketplace for renting spare local compute for lightweight AI and batch jobs. The project includes a Next.js control plane, a Tauri provider desktop app, a legacy Node.js worker CLI, and a Docker-based sandbox runner for executing approved demo workloads.

The current demo is intentionally narrow: users create jobs in the web app, providers register machines, a scheduler assigns queued work, and worker software reports heartbeats, progress, completion, failures, and mock earnings.

## What Is Included

- Next.js App Router web app for the marketplace, provider dashboard, jobs, earnings, setup, and settings.
- MongoDB/Mongoose models for providers, jobs, assignments, and job events.
- API routes for provider registration, provider heartbeat, job creation, job lookup, worker polling, progress, completion, and failure.
- Tauri desktop shell for a provider node UI with runtime status, controls, metrics, earnings, and sandbox runner management.
- Node.js worker CLI for provider polling and mocked execution.
- `worker-runner` service for running approved jobs in constrained Docker containers.
- MongoDB starter schema, indexes, and seed data.

## Architecture

```text
Customer creates a job
  -> Next.js API stores the queued job in MongoDB
  -> scheduler assigns queued work to an online provider
  -> provider software polls for work
  -> job runs through the mock executor or Docker sandbox runner
  -> provider reports start/progress/complete/fail
  -> API records job events and mock provider/platform earnings
```

The main pieces live here:

- `app/`: Next.js pages and API routes.
- `components/`: Shared UI primitives.
- `lib/`: Mongoose models, DB helpers, scheduling, pricing, types, and utilities.
- `src/`: Provider desktop UI components, hooks, runtime reducers, Tauri clients, and mock worker data.
- `src-tauri/`: Tauri v2 Rust shell and worker manager.
- `worker/`: Legacy Node.js provider CLI.
- `worker-runner/`: Docker sandbox execution service.
- `mongodb/`: Starter schema notes, indexes, and seed data.

## Requirements

- Node.js 20+ recommended.
- npm.
- MongoDB Atlas or a local MongoDB-compatible URI.
- Rust and Tauri prerequisites for the desktop app.
- Docker for `worker-runner`.

## Environment

Create the root app env file:

```bash
cp .env.example .env.local
```

At minimum, set:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/gpubnb?retryWrites=true&w=majority
MONGODB_DB_NAME=gpubnb
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The legacy worker CLI also reads:

```env
GPUBNB_API_URL=http://localhost:3000
GPUBNB_PROVIDER_ID=
GPUBNB_PROVIDER_TOKEN=
GPUBNB_MACHINE_NAME=Local Dev Machine
GPUBNB_HEARTBEAT_INTERVAL_MS=5000
GPUBNB_POLL_INTERVAL_MS=3000
```

## Setup

Install the root dependencies:

```bash
npm install
```

Start the web app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Seed MongoDB if you want sample providers and jobs:

```bash
mongosh "$MONGODB_URI" mongodb/indexes.js
mongosh "$MONGODB_URI" mongodb/seed.js
```

## Provider Options

### Desktop App

Run the provider desktop app:

```bash
npm run tauri
```

The Tauri shell starts the Next.js frontend, opens the provider UI, and exposes worker controls through `src-tauri/src/worker_manager.rs`.

### Legacy CLI

Run the provider CLI in a second terminal:

```bash
npm run worker
```

The CLI registers a provider if needed, sends heartbeats, polls for assignments, runs the current mocked executor, and reports lifecycle updates back to the API.

## Docker Sandbox Runner

`worker-runner` is the constrained local execution service used for approved demo job types. It runs jobs in short-lived Docker containers with CPU, memory, process, filesystem, network, timeout, and log limits.

From `worker-runner/`:

```bash
npm install
cp .env.example .env
docker build -t computebnb/python-runner:local samples/images/python-runner
npm run dev
```

The service listens on [http://localhost:4317](http://localhost:4317). See [`worker-runner/README.md`](worker-runner/README.md) for payload examples, REST endpoints, polling mode, and safety notes.

## Demo Flow

1. Configure `.env.local` with a MongoDB connection.
2. Start the web app with `npm run dev`.
3. Start a provider through `npm run tauri` or `npm run worker`.
4. Open `/providers` or `/dashboard` and confirm the provider is online.
5. Submit a job from `/jobs/new`.
6. Watch the provider poll, start, report progress, and complete the job.
7. Open the job result page to inspect output, events, and the mock 80% provider payout / 20% platform fee split.

## Useful Scripts

- `npm run dev`: start the Next.js app.
- `npm run build`: build the Next.js app.
- `npm run start`: serve the built app.
- `npm run lint`: run ESLint.
- `npm run tauri`: run the Tauri provider desktop app in development.
- `npm run tauri:build`: build the provider desktop app bundle.
- `npm run worker`: run the legacy provider CLI.
- `npm run worker:dev`: run the legacy provider CLI in watch mode.

Inside `worker-runner/`:

- `npm run dev`: start the Docker sandbox runner in watch mode.
- `npm run start`: start the runner once.
- `npm run build`: compile TypeScript.
- `npm run typecheck`: typecheck without emitting files.

## MVP Boundaries

Implemented for demo:

- Provider registration and heartbeat.
- Job creation, scheduling, status updates, and result pages.
- MongoDB-backed route handlers and Mongoose models.
- Provider dashboard views for active jobs, recent jobs, resource usage, earnings, and trust controls.
- Docker sandbox runner with an image allow-list and constrained runtime settings.

Still MVP-grade:

- Auth is a UI/demo flow, not production identity.
- Provider token validation is incomplete.
- Scheduler assignment is simple and not fully transaction-safe.
- Pricing and payouts are mocked.
- Capability matching is lightweight.
- Docker sandboxing is suitable for demos, not hostile-code isolation.
- Larger payloads and artifacts need durable object storage.

## Next Steps

1. Add real authentication and user/provider authorization checks.
2. Hash and validate provider tokens across all worker APIs.
3. Make scheduling atomic so one queued job can be claimed by exactly one online provider.
4. Connect the desktop runtime to the marketplace API and `worker-runner` end to end.
5. Persist runner logs, artifacts, and results outside memory.
6. Add live job updates through polling, Server-Sent Events, or change streams.

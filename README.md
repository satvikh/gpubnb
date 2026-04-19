# GPUbnb

ComputeBNB/GPUbnb is a hackathon marketplace for routing lightweight AI and batch jobs onto spare provider machines.

The project now has one clear web story: 

- the stylized marketplace web app is the main product surface
- the Mongo-backed backend is the source of truth for machines, jobs, payouts, and event history
- the desktop/Tauri provider runtime and Docker sandbox runner are wired in as provider-side execution surfaces

This repo intentionally does **not** try to claim production-grade sandboxing, decentralized verification, or a global GPU cloud. It focuses on a truthful, legible marketplace loop:

```text
submit text job
  -> consumer chooses a machine
  -> backend creates queued job pinned to that machine
  -> machine polls its own queue, starts, and reports progress
  -> backend records stdout, stderr, exit code, payout, fee, and events
  -> stylized web dashboard reflects the result
```

## What’s Implemented

### Web

- Stylized landing page and marketplace-themed dashboard
- Backend-driven marketplace dashboard at `/dashboard`
- Backend-driven providers view at `/providers`
- Backend-driven jobs board at `/jobs`
- Styled job submission flow at `/jobs/new`
- Styled results/ledger view at `/jobs/[id]/results`
- Temporary frontend-only demo session shortcut with `Ctrl+K`

### Backend

- Mongo/Mongoose models for machines, jobs, job events, and ledger entries
- Machine inventory plus provider-compatible registration and heartbeat APIs
- Job creation and lookup APIs
- Machine poll/start/progress/complete/fail APIs
- Runtime-based pricing with budget cap
- 80/20 machine payout / platform fee split
- Basic trust signals:
  - machine completed jobs
  - machine failed jobs
  - machine success rate
  - last heartbeat
  - raw stdout / stderr / exit code
  - job runtime
  - event timeline
- Mocked bearer tokens preserved for worker heartbeat, poll, start, progress, complete, and fail routes

### Provider Runtime

- Tauri desktop shell for provider controls and runtime status
- Node worker CLI for provider registration, heartbeat, polling, and mocked execution
- `worker-runner` Docker sandbox service for approved demo workloads
- Sandbox runner controls exposed through the Tauri command layer

## Current Scope

This pass is intentionally limited to:

- text-first inputs and outputs, plus approved Docker demo workloads
- consumer-selected machines with no backend scheduler
- backend truth for marketplace pages
- lightweight provider token auth for worker routes

Out of scope for now:

- real user auth
- production user authentication and authorization
- object/file storage
- heavy artifact processing
- hostile-code sandboxing guarantees
- production infra hardening

## Project Structure

- `app/`: Next.js App Router pages and API routes
- `app/_components/`: stylized marketplace UI primitives and shell components
- `lib/models/`: Mongo/Mongoose schemas
- `lib/marketplace.ts`: shared formatting and dashboard/machine/job query helpers
- `lib/scheduling.ts`: compatibility helpers for machine polling and stale-heartbeat cleanup
- `src/`: provider desktop UI components, hooks, reducers, and Tauri clients
- `src-tauri/`: Tauri v2 provider desktop shell and worker manager
- `worker/`: lightweight CLI worker used for the current execution loop
- `worker-runner/`: Docker sandbox execution service

## Environment

Create `.env.local` from `.env.example`.

Important values:

```bash
MONGODB_URI=...
MONGODB_DB_NAME=gpubnb
GPUBNB_API_URL=http://localhost:3000
GPUBNB_PROVIDER_ID=
GPUBNB_PROVIDER_TOKEN=
COMPUTEBNB_MASTER_WALLET_SECRET_KEY=
COMPUTEBNB_CONSUMER_DEMO_TARGET_SOL=1
```

The app now builds cleanly even when Mongo is not configured, but backend-powered marketplace pages and APIs will show database-unavailable behavior until `MONGODB_URI` is set.

## Local Development

Install dependencies:

```bash
npm install
```

Run the web app:

```bash
npm run dev
```

This starts the main consumer web app and backend on `http://localhost:3000`.

Run the Tauri desktop app:

```bash
npm run tauri
```

In development, Tauri serves its embedded webview from `http://localhost:3001`, while its worker/API calls target the main app on `http://localhost:3000`.

Optional: run the lightweight worker loop in another terminal:

```bash
npm run worker
```

Optional: run the Tauri provider app:

```bash
npm run tauri
```

Optional: run the Docker sandbox runner from `worker-runner/`:

```bash
npm install
cp .env.example .env
docker build -t computebnb/python-runner:local samples/images/python-runner
npm run dev
```

The runner listens on `http://localhost:4317`. See `worker-runner/README.md` for endpoint and payload examples.

## Solana Devnet Demo Funding

Create a devnet master wallet and save it to `.env.local`:

```bash
npm run solana:master:create -- --write-env
```

The script prints the wallet address and secret key, then requests a devnet airdrop. Set `COMPUTEBNB_MASTER_AIRDROP_SOL` to change the airdrop amount; it defaults to `5`.

Top up every consumer wallet to the demo target balance:

```bash
npm run solana:consumers:fund
```

Set `COMPUTEBNB_CONSUMER_DEMO_TARGET_SOL` to control the target balance per consumer wallet; it defaults to `1`. The script skips wallets that already have at least the target balance and prints each transfer signature.

## Demo Flow

1. Start the web app.
2. Register or heartbeat at least one machine through the Tauri or worker flow.
3. Open `/dashboard` to show live marketplace summary.
4. Submit a Python job pinned to a machine.
5. Let that machine pick it up and complete it.
6. Open `/jobs/[id]/results` to show:
   - selected machine
   - raw stdout / stderr / exit code
   - runtime
   - final job cost
   - machine payout
   - platform fee
   - event trail

## Quality Checks

- `npm run lint`
- `npm run build`

Both should pass before demoing.

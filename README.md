# Computebnb

Computebnb is a hackathon MVP for a marketplace where people lend out spare laptop or desktop compute for lightweight AI jobs. Users submit jobs through a web app. Provider machines run a local Node.js CLI agent that registers the machine, polls for work, executes one job at a time, reports progress/results, and earns money in a mock internal ledger.

Computebnb is not a decentralized training protocol, not a blockchain app, and not a desktop app. The web app is the control plane; the provider software is a CLI worker.

## Architecture

- `app/`: Next.js App Router pages and API routes.
- `components/`: Small shadcn-style UI primitives and shared view components.
- `lib/`: Shared TypeScript types, utilities, mock in-memory store, and MongoDB Atlas client helper.
- `worker/`: Local provider CLI agent in Node.js/TypeScript.
- `mongodb/`: Starter Atlas collection shapes, indexes, and seed data.

```text
User submits job
  -> Next.js API creates queued job
  -> simple scheduler assigns to an online provider
  -> provider CLI polls and receives assignment
  -> provider CLI reports start/progress/complete/fail
  -> API updates job, events, and mock 80/20 ledger split
```

## MVP Scope

Included:

- Landing page for the product story.
- Providers page with machine status, capabilities, rates, and mock earnings.
- Jobs page with lifecycle status.
- Job submission page.
- Result page with input, output, ledger, and event log.
- Provider registration API.
- Provider heartbeat API.
- Job creation and lookup APIs.
- Worker polling API.
- Job start/progress/complete/fail APIs.
- Local worker CLI skeleton.
- MongoDB Atlas collection specs for `providers`, `jobs`, `assignments`, and `job_events`.

Stubbed for hackathon speed:

- Auth and user accounts.
- Real MongoDB Atlas persistence in route handlers.
- Secure provider token validation.
- Capability-aware scheduling.
- Sandboxed execution.
- File/object storage for larger job payloads.
- Production billing and payout settlement.

## Local Agent Design

The provider CLI lives in `worker/` and follows this loop:

1. Register the machine unless `Computebnb_PROVIDER_ID` is already configured.
2. Send a heartbeat every few seconds.
3. Poll the control plane for one assigned job.
4. Execute the job locally through `worker/executor.ts`.
5. Report start, progress, completion, or failure.
6. Return to polling.

The executor is intentionally mocked. It gives the demo a believable local-worker flow without pulling in heavyweight AI runtimes during a 24-hour build.

## Setup

Install dependencies:

```bash
npm install
```

Create local env:

```bash
cp .env.example .env.local
```

Run the web app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

In a second terminal, run the provider agent:

```bash
npm run worker
```

Optional MongoDB Atlas setup:

1. Create a MongoDB Atlas cluster.
2. Create a database named `Computebnb`.
3. Review `mongodb/schema.md` for the collection shapes.
4. Run `mongodb/indexes.js` with `mongosh` to create starter indexes.
5. Run `mongodb/seed.js` with `mongosh` for sample provider/job data.
6. Fill in `MONGODB_URI` and `MONGODB_DB_NAME`.
7. Replace the mock store calls in API routes with MongoDB collection queries.

## Demo Flow

1. Start `npm run dev`.
2. Start `npm run worker` in another terminal.
3. Open the providers page and confirm a provider is online.
4. Submit a job from `/jobs/new`.
5. Watch the worker terminal poll, start, report progress, and complete the job.
6. Open the job result page to show output, events, and the 80% provider payout / 20% platform fee split.

## Useful Scripts

- `npm run dev`: start the Next.js app.
- `npm run build`: build the Next.js app.
- `npm run start`: serve the built app.
- `npm run worker`: run the local provider CLI.
- `npm run worker:dev`: run the provider CLI in watch mode.

## Next Five Implementation Steps

1. Replace `lib/mock-store.ts` with MongoDB Atlas-backed repositories or route-handler queries.
2. Add provider token hashing and validation for all worker APIs.
3. Implement a tiny scheduler transaction that atomically assigns one queued job to one online provider.
4. Add a real executor adapter for one safe demo job type, such as local shell commands from an allowlist or a small local model call.
5. Add live refresh on job/result pages through lightweight polling or MongoDB change streams.

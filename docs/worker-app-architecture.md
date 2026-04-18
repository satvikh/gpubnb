# ComputeBNB Provider Worker App

## Folder Structure

- `app/auth`, `app/setup`, `app/dashboard`, `app/jobs`, `app/earnings`, `app/settings`: worker app routes.
- `src/components/worker`: reusable command-center components.
- `src/hooks/use-worker.tsx`: provider state context and action dispatch surface.
- `src/lib/worker-runtime.ts`: mock worker process logic, job assignment, heartbeats, metrics, logs, and earnings.
- `src/lib/tauri-adapter.ts`: frontend adapter for future native worker commands.
- `src/types/worker.ts`: Machine, Job, Earnings, settings, and runtime state contracts.
- `src/mocks/worker-data.ts`: first-run machine data, seed jobs, logs, and earnings.
- `src-tauri`: native app shell and command integration points.

## Page Map

- `/auth`: polished sign-in and product explanation.
- `/setup`: machine detection, preferences, and registration.
- `/dashboard`: main worker command center and demo flow.
- `/jobs`: active workload, recent jobs, resource health, and logs.
- `/earnings`: payout balance, earnings chart, and completed jobs.
- `/settings`: availability, CPU limits, allowed job types, and emergency disconnect.

## Component Architecture

- `AppShell`: desktop chrome, sidebar, top status strip, page framing.
- `TopStatusBar`: worker status, network, heartbeat, safety state.
- `MachineOverviewCard`: machine specs and start/stop controls.
- `ActiveJobCard`: current job progress, elapsed time, resources, and earnings.
- `ResourceUsageCard`: CPU, memory, battery, temperature, network, heartbeat.
- `ActivityLogPanel`: realtime worker/job logs.
- `EarningsCard`: totals, payout summary, and history chart.
- `RecentJobsTable`: completed job history.
- `TrustSafetyCard`: sandbox/privacy/trust controls.
- `SettingToggleRow` and `CpuLimitSlider`: reusable settings primitives.

## Type Contracts

The core contracts live in `src/types/worker.ts` and separate UI concerns from worker behavior:

- `Machine`: identity, specs, status, owner limits, heartbeat, uptime.
- `Job`: workload metadata, status, progress, resource usage, logs, earnings.
- `Earnings`: lifetime, pending, today, completed count, chart history.
- `WorkerSettings`: charging-only, CPU cap, background mode, auto-accept, allowed job types.
- `WorkerState`: composed app runtime state.
- `WorkerAction`: control events consumed by the worker runtime reducer.

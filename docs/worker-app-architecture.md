# ComputeBNB Provider Worker App

## Architecture Update

The provider app is now a frontend-first desktop MVP with a real worker boundary. React no longer owns simulated worker execution. The UI dispatches intent through a typed worker client, Tauri commands cross into the native layer, and a Rust-managed local worker runner emits lifecycle events back to the frontend.

This keeps the hackathon demo lightweight while making the runtime architecture more credible:

- React owns presentation, route flow, local auth demo state, and event subscription.
- `src/lib/worker-client.ts` owns the worker control interface: `detectMachine`, `registerMachine`, `startWorker`, `stopWorker`, `pauseWorker`, `resumeWorker`, `getWorkerStatus`, `updateWorkerSettings`, `emergencyStop`, and `subscribeToWorkerEvents`.
- `src/lib/tauri-commands.ts` owns typed command invocation.
- `src/lib/tauri-events.ts` owns event names and listener setup.
- `src/hooks/use-worker.tsx` is an event-driven store that applies worker snapshots and events.
- `src-tauri/src/worker_manager.rs` owns local worker lifecycle, heartbeats, metrics, logs, job progress, completion, and earnings updates.

The current native worker is intentionally in-process and simulated. It is structured so a later version can replace job assignment, metrics, and persistence with real backend calls without pushing worker logic back into UI components.

## File-by-File Refactor Plan

- `src/types/worker.ts`: shared worker state, command-adjacent snapshot, and typed event contracts.
- `src/lib/tauri-commands.ts`: command names and typed `invoke` wrappers.
- `src/lib/tauri-events.ts`: event names and typed listener wiring.
- `src/lib/worker-client.ts`: clean worker control interface consumed by React.
- `src/lib/worker-runtime.ts`: state reducer only; applies worker events and snapshots, no timer loop.
- `src/hooks/use-worker.tsx`: subscribes to worker events, calls worker client commands, preserves existing page API.
- `src-tauri/src/lib.rs`: registers native state and Tauri commands.
- `src-tauri/src/worker_manager.rs`: Rust-managed worker runtime and event emitter.

## Event Contracts

The frontend listens for these Tauri events. Payloads are typed in `src/types/worker.ts` as the `WorkerEvent` union.

- `worker-machine-detected`: `{ type: "machine_detected", machine }`
- `worker-machine-registered`: `{ type: "machine_registered", machine, settings }`
- `worker-status-changed`: `{ type: "worker_status_changed", status, lastHeartbeatAt, uptimeSeconds }`
- `worker-heartbeat`: `{ type: "heartbeat", at, latencyMs, uptimeSeconds }`
- `worker-job-assigned`: `{ type: "job_assigned", job }`
- `worker-job-progress`: `{ type: "job_progress", job }`
- `worker-log-emitted`: `{ type: "log_emitted", log, jobId }`
- `worker-job-completed`: `{ type: "job_completed", job, recentJobs }`
- `worker-metrics-updated`: `{ type: "metrics_updated", metrics }`
- `worker-earnings-updated`: `{ type: "earnings_updated", earnings }`
- `worker-settings-updated`: `{ type: "settings_updated", settings }`
- `worker-error`: `{ type: "worker_error", message, recoverable }`
- `worker-snapshot`: `{ type: "snapshot", snapshot }`

## Tauri Commands

The native command surface is intentionally small and maps to worker owner actions:

- `detect_machine() -> Machine`
- `register_machine(settings: WorkerSettings) -> WorkerRuntimeSnapshot`
- `start_worker() -> WorkerRuntimeSnapshot`
- `stop_worker() -> WorkerRuntimeSnapshot`
- `pause_worker() -> WorkerRuntimeSnapshot`
- `resume_worker() -> WorkerRuntimeSnapshot`
- `get_worker_status() -> WorkerRuntimeSnapshot`
- `update_worker_settings(settings: WorkerSettings) -> WorkerRuntimeSnapshot`
- `emergency_stop() -> WorkerRuntimeSnapshot`

Commands return a snapshot for immediate UI consistency. The Rust manager also emits granular events so the frontend can update live state as a real local worker would.

## Native Worker Manager

The native runner is a Rust in-process task managed by Tauri. It keeps runtime state in memory, starts one background loop when the worker is running, and emits events every tick.

Current local behavior:

- detects a local machine profile
- registers owner settings
- transitions through offline, idle, busy, paused, and error-ready states
- emits periodic heartbeats
- simulates CPU, memory, battery, temperature, network, and latency metrics
- assigns an auto-accepted local job after the worker is online
- emits progress logs and resource changes
- completes jobs, updates recent jobs, and increments earnings
- supports stop, pause, resume, settings changes, and emergency stop

## Folder Structure

- `app/auth`, `app/setup`, `app/dashboard`, `app/jobs`, `app/earnings`, `app/settings`: worker app routes.
- `src/components/worker`: reusable command-center components.
- `src/hooks/use-worker.tsx`: event-driven provider state context and command dispatch surface.
- `src/lib/worker-runtime.ts`: reducer for worker snapshots and native events.
- `src/lib/worker-client.ts`: typed worker control layer.
- `src/lib/tauri-commands.ts`: Tauri command wrappers.
- `src/lib/tauri-events.ts`: Tauri event subscriptions.
- `src/types/worker.ts`: Machine, Job, Earnings, settings, and runtime state contracts.
- `src/mocks/worker-data.ts`: first-run machine data, seed jobs, logs, and earnings.
- `src-tauri`: native app shell, command integration points, and local worker manager.

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
- `WorkerRuntimeSnapshot`: native-owned runtime state returned by commands.
- `WorkerEvent`: typed native event union applied by the frontend reducer.
- `WorkerAction`: local reducer actions for auth, optimistic settings, snapshots, and worker events.

use std::{
    fs,
    net::TcpStream,
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use chrono::{Duration as ChronoDuration, SecondsFormat, Utc};
use reqwest::{
    blocking::Client,
    header::{HeaderMap, HeaderValue, CONTENT_TYPE},
};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{async_runtime::JoinHandle, AppHandle, Emitter};

const STATUS_CHANGED_EVENT: &str = "worker-status-changed";
const HEARTBEAT_EVENT: &str = "worker-heartbeat";
const JOB_ASSIGNED_EVENT: &str = "worker-job-assigned";
const JOB_PROGRESS_EVENT: &str = "worker-job-progress";
const LOG_EMITTED_EVENT: &str = "worker-log-emitted";
const JOB_COMPLETED_EVENT: &str = "worker-job-completed";
const METRICS_UPDATED_EVENT: &str = "worker-metrics-updated";
const EARNINGS_UPDATED_EVENT: &str = "worker-earnings-updated";
const MACHINE_DETECTED_EVENT: &str = "worker-machine-detected";
const MACHINE_REGISTERED_EVENT: &str = "worker-machine-registered";
const SETTINGS_UPDATED_EVENT: &str = "worker-settings-updated";
const SNAPSHOT_EVENT: &str = "worker-snapshot";
const WORKER_ERROR_EVENT: &str = "worker-error";

const HEARTBEAT_INTERVAL_SECS: u64 = 5;
const TICK_INTERVAL_MS: u64 = 2000;

#[derive(Clone)]
pub struct WorkerManager {
    runtime: Arc<Mutex<WorkerRuntime>>,
    task: Arc<Mutex<Option<JoinHandle<()>>>>,
    sandbox_runner: Arc<Mutex<Option<Child>>>,
    http: Client,
}

impl WorkerManager {
    pub fn new() -> Self {
        let http = Client::builder()
            .timeout(Duration::from_secs(20))
            .build()
            .expect("worker http client should initialize");

        Self {
            runtime: Arc::new(Mutex::new(WorkerRuntime::new())),
            task: Arc::new(Mutex::new(None)),
            sandbox_runner: Arc::new(Mutex::new(None)),
            http,
        }
    }

    fn snapshot(&self) -> WorkerRuntimeSnapshot {
        self.runtime
            .lock()
            .expect("worker runtime poisoned")
            .snapshot()
    }

    fn emit_snapshot(&self, app: &AppHandle) {
        emit_worker_event(
            app,
            SNAPSHOT_EVENT,
            SnapshotEvent {
                event_type: "snapshot",
                snapshot: self.snapshot(),
            },
        );
    }

    fn emit_log(&self, app: &AppHandle, log: JobLog, job_id: Option<String>) {
        emit_worker_event(
            app,
            LOG_EMITTED_EVENT,
            ActivityLogEvent {
                event_type: "log_emitted",
                log,
                job_id,
            },
        );
    }

    fn emit_error(&self, app: &AppHandle, message: impl Into<String>, recoverable: bool) {
        emit_worker_event(
            app,
            WORKER_ERROR_EVENT,
            WorkerErrorEvent {
                event_type: "worker_error",
                message: message.into(),
                recoverable,
            },
        );
    }

    fn runner_url(&self) -> String {
        self.runtime
            .lock()
            .expect("worker runtime poisoned")
            .runner_url
            .clone()
    }

    fn ensure_runner(&self, app: AppHandle) {
        let mut task = self.task.lock().expect("worker task poisoned");
        if task.is_some() {
            return;
        }

        let manager = self.clone();
        *task = Some(tauri::async_runtime::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_millis(TICK_INTERVAL_MS)).await;
                manager.tick(&app);
            }
        }));
    }

    fn stop_runner(&self) {
        if let Some(task) = self.task.lock().expect("worker task poisoned").take() {
            task.abort();
        }
    }

    fn sandbox_status(&self) -> SandboxRunnerStatus {
        let mut managed = false;
        let mut pid = None;

        {
            let mut child_guard = self
                .sandbox_runner
                .lock()
                .expect("sandbox runner process poisoned");
            if let Some(child) = child_guard.as_mut() {
                if matches!(child.try_wait(), Ok(Some(_))) {
                    *child_guard = None;
                } else {
                    managed = true;
                    pid = Some(child.id());
                }
            }
        }

        let runner_url = self.runner_url();
        let http_online = runner_url
            .strip_prefix("http://")
            .and_then(parse_host_port)
            .map(|(host, port)| TcpStream::connect((host.as_str(), port)).is_ok())
            .unwrap_or_else(|| TcpStream::connect(("127.0.0.1", 4317)).is_ok());

        SandboxRunnerStatus {
            running: http_online || managed,
            managed,
            pid,
            url: runner_url.clone(),
            detail: if http_online {
                format!("worker-runner is reachable at {runner_url}")
            } else if managed {
                "worker-runner process is starting".to_string()
            } else {
                "worker-runner is not running".to_string()
            },
        }
    }

    fn ensure_sandbox_runner_ready(&self, app: &AppHandle) -> Result<(), String> {
        if self.runner_health().is_ok() {
            return Ok(());
        }

        let current = self.sandbox_status();
        if !current.running {
            let worker_dir = worker_runner_dir()?;
            let child = spawn_shell("npm run start", Some(worker_dir.clone()))?;
            {
                let mut child_guard = self
                    .sandbox_runner
                    .lock()
                    .expect("sandbox runner process poisoned");
                *child_guard = Some(child);
            }

            let log = {
                let mut runtime = self.runtime.lock().expect("worker runtime poisoned");
                runtime.push_log(
                    LogLevel::Success,
                    &format!(
                        "Docker sandbox runner started from {}.",
                        worker_dir.to_string_lossy()
                    ),
                )
            };
            self.emit_log(app, log, None);
        }

        for _ in 0..24 {
            if self.runner_health().is_ok() {
                return Ok(());
            }
            std::thread::sleep(Duration::from_millis(500));
        }

        Err("worker-runner did not become healthy in time".to_string())
    }

    fn runner_health(&self) -> Result<(), String> {
        let runner_url = self.runner_url();
        let response: RunnerHealthResponse = get_json(
            &self.http,
            &format!("{runner_url}/health"),
            HeaderMap::new(),
        )?;

        if response.ok {
            Ok(())
        } else {
            Err(response
                .docker
                .map(|docker| docker.detail)
                .unwrap_or_else(|| "worker-runner reported unhealthy state".to_string()))
        }
    }

    fn tick(&self, app: &AppHandle) {
        let mut events = Vec::new();
        let mut errors = Vec::new();

        let mut runtime = self.runtime.lock().expect("worker runtime poisoned");

        if matches!(runtime.machine.status, WorkerStatus::Offline | WorkerStatus::Error)
            || (!runtime.active_execution.is_some() && runtime.pause_requested)
        {
            runtime.update_idle_metrics();
            events.push(RuntimeEvent::MetricsUpdated(MetricsUpdateEvent {
                event_type: "metrics_updated",
                metrics: runtime.metrics.clone(),
            }));
            drop(runtime);
            emit_events(app, events);
            for (message, recoverable) in errors {
                self.emit_error(app, message, recoverable);
            }
            self.emit_snapshot(app);
            return;
        }

        runtime.machine.uptime_seconds += TICK_INTERVAL_MS / 1000;

        if let Some(session) = runtime.provider_session.clone() {
            let heartbeat_due = runtime
                .last_heartbeat_at
                .map(|at| at.elapsed().as_secs() >= HEARTBEAT_INTERVAL_SECS)
                .unwrap_or(true);

            if heartbeat_due {
                let remote_status = if runtime.active_execution.is_some() {
                    "busy"
                } else {
                    "active"
                };
                match send_heartbeat(&self.http, &runtime.api_url, &session, remote_status) {
                    Ok(heartbeat) => {
                        runtime.network_online = true;
                        runtime.last_heartbeat_at = Some(Instant::now());
                        runtime.machine.last_heartbeat_at = Some(now());
                        runtime.metrics.heartbeat_latency_ms = heartbeat.latency_ms;
                        runtime.note_network_recovery();
                        events.push(RuntimeEvent::Heartbeat(HeartbeatEvent {
                            event_type: "heartbeat",
                            at: runtime.machine.last_heartbeat_at.clone().unwrap_or_else(now),
                            latency_ms: heartbeat.latency_ms,
                            uptime_seconds: runtime.machine.uptime_seconds,
                        }));
                    }
                    Err(error) => {
                        runtime.network_online = false;
                        if let Some(message) = runtime.note_network_failure(error) {
                            errors.push((message, true));
                        }
                    }
                }
            }
        }

        if let Some(execution) = runtime.active_execution.clone() {
            match sync_active_execution(&self.http, &mut runtime, execution) {
                Ok(sync_events) => events.extend(sync_events),
                Err(error) => {
                    if let Some(message) = runtime.note_network_failure(error) {
                        errors.push((message, true));
                    }
                }
            }
        } else if !runtime.pause_requested && runtime.settings.auto_accept_jobs {
            match poll_for_assignment(&self.http, &mut runtime) {
                Ok(mut poll_events) => events.append(&mut poll_events),
                Err(error) => {
                    if let Some(message) = runtime.note_network_failure(error) {
                        errors.push((message, true));
                    }
                }
            }
        } else if runtime.active_execution.is_none() && !matches!(runtime.machine.status, WorkerStatus::Paused)
        {
            runtime.machine.status = WorkerStatus::Paused;
            events.push(RuntimeEvent::StatusChanged(WorkerStatusChangedEvent {
                event_type: "worker_status_changed",
                status: WorkerStatus::Paused,
                last_heartbeat_at: runtime.machine.last_heartbeat_at.clone(),
                uptime_seconds: runtime.machine.uptime_seconds,
            }));
        }

        if runtime.active_execution.is_none() && !runtime.pause_requested {
            runtime.machine.status = WorkerStatus::Idle;
        }

        runtime.update_metrics_for_current_state();
        events.push(RuntimeEvent::MetricsUpdated(MetricsUpdateEvent {
            event_type: "metrics_updated",
            metrics: runtime.metrics.clone(),
        }));

        drop(runtime);
        emit_events(app, events);
        for (message, recoverable) in errors {
            self.emit_error(app, message, recoverable);
        }
        self.emit_snapshot(app);
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Machine {
    id: String,
    name: String,
    os: String,
    cpu: String,
    gpu: String,
    memory_gb: u32,
    status: WorkerStatus,
    charging: bool,
    cpu_limit: f64,
    auto_accept_jobs: bool,
    background_running: bool,
    charging_only: bool,
    last_heartbeat_at: Option<String>,
    uptime_seconds: u64,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum WorkerStatus {
    Offline,
    Online,
    Idle,
    Busy,
    Paused,
    Error,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceMetrics {
    cpu_usage: f64,
    memory_usage: f64,
    battery_percent: f64,
    temperature_c: f64,
    network_mbps: f64,
    heartbeat_latency_ms: u32,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum JobStatus {
    Queued,
    Running,
    Completed,
    Failed,
    Paused,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum JobType {
    Render,
    Simulation,
    BatchInference,
    Compile,
    DataCleaning,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobLog {
    id: String,
    at: String,
    level: LogLevel,
    message: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum LogLevel {
    Info,
    Success,
    Warning,
    Error,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Job {
    id: String,
    name: String,
    #[serde(rename = "type")]
    job_type: JobType,
    status: JobStatus,
    progress: f64,
    started_at: Option<String>,
    estimated_completion_at: Option<String>,
    earnings: f64,
    cpu_usage: f64,
    memory_usage: f64,
    logs: Vec<JobLog>,
    execution_output: Option<String>,
    execution_error: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EarningsPoint {
    label: String,
    amount: f64,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Earnings {
    lifetime: f64,
    pending: f64,
    today: f64,
    completed_jobs: u32,
    history: Vec<EarningsPoint>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerSettings {
    charging_only: bool,
    cpu_limit: f64,
    background_running: bool,
    auto_accept_jobs: bool,
    auto_start: bool,
    active_hours: String,
    allowed_job_types: Vec<JobType>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerRuntimeSnapshot {
    registered: bool,
    machine: Machine,
    metrics: ResourceMetrics,
    active_job: Option<Job>,
    recent_jobs: Vec<Job>,
    earnings: Earnings,
    settings: WorkerSettings,
    network_online: bool,
    worker_logs: Vec<JobLog>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerHealth {
    ok: bool,
    detail: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SandboxRunnerStatus {
    running: bool,
    managed: bool,
    pid: Option<u32>,
    url: String,
    detail: String,
}

#[derive(Clone)]
struct ProviderSession {
    producer_user_id: String,
    provider_id: String,
    provider_token: String,
}

#[derive(Clone)]
struct ActiveExecution {
    remote_job_id: String,
    runner_job_id: String,
    last_stdout_len: usize,
    last_stderr_len: usize,
    last_state: String,
}

struct WorkerRuntime {
    registered: bool,
    machine: Machine,
    metrics: ResourceMetrics,
    active_job: Option<Job>,
    recent_jobs: Vec<Job>,
    earnings: Earnings,
    settings: WorkerSettings,
    network_online: bool,
    worker_logs: Vec<JobLog>,
    rng_seed: u64,
    api_url: String,
    runner_url: String,
    provider_session: Option<ProviderSession>,
    active_execution: Option<ActiveExecution>,
    pause_requested: bool,
    last_heartbeat_at: Option<Instant>,
    last_network_error: Option<String>,
}

impl WorkerRuntime {
    fn new() -> Self {
        let settings = WorkerSettings {
            charging_only: true,
            cpu_limit: 62.0,
            background_running: true,
            auto_accept_jobs: true,
            auto_start: false,
            active_hours: "6:00 PM - 8:00 AM".to_string(),
            allowed_job_types: vec![
                JobType::Render,
                JobType::Simulation,
                JobType::BatchInference,
                JobType::Compile,
            ],
        };

        Self {
            registered: false,
            machine: Machine {
                id: "node-local-preview".to_string(),
                name: local_machine_name(),
                os: local_os_name(),
                cpu: "Docker-backed Python worker".to_string(),
                gpu: "Docker-compatible".to_string(),
                memory_gb: 16,
                status: WorkerStatus::Offline,
                charging: true,
                cpu_limit: settings.cpu_limit,
                auto_accept_jobs: settings.auto_accept_jobs,
                background_running: settings.background_running,
                charging_only: settings.charging_only,
                last_heartbeat_at: None,
                uptime_seconds: 0,
            },
            metrics: ResourceMetrics {
                cpu_usage: 6.0,
                memory_usage: 28.0,
                battery_percent: 86.0,
                temperature_c: 41.0,
                network_mbps: 124.0,
                heartbeat_latency_ms: 0,
            },
            active_job: None,
            recent_jobs: Vec::new(),
            earnings: Earnings {
                lifetime: 0.0,
                pending: 0.0,
                today: 0.0,
                completed_jobs: 0,
                history: Vec::new(),
            },
            settings,
            network_online: true,
            worker_logs: vec![log(
                "log-boot",
                LogLevel::Info,
                "Control plane ready. Producer machine is waiting for backend registration.",
            )],
            rng_seed: 0xC0FFEE,
            api_url: repo_env("GPUBNB_API_URL")
                .or_else(|| repo_env("NEXT_PUBLIC_APP_URL"))
                .unwrap_or_else(|| "http://localhost:3001".to_string()),
            runner_url: repo_env("GPUBNB_WORKER_RUNNER_URL")
                .or_else(|| repo_env("WORKER_RUNNER_URL"))
                .unwrap_or_else(|| "http://localhost:4317".to_string()),
            provider_session: None,
            active_execution: None,
            pause_requested: false,
            last_heartbeat_at: None,
            last_network_error: None,
        }
    }

    fn snapshot(&self) -> WorkerRuntimeSnapshot {
        WorkerRuntimeSnapshot {
            registered: self.registered,
            machine: self.machine.clone(),
            metrics: self.metrics.clone(),
            active_job: self.active_job.clone(),
            recent_jobs: self.recent_jobs.clone(),
            earnings: self.earnings.clone(),
            settings: self.settings.clone(),
            network_online: self.network_online,
            worker_logs: self.worker_logs.clone(),
        }
    }

    fn push_log(&mut self, level: LogLevel, message: &str) -> JobLog {
        let log = log_with_random_id(&mut self.rng_seed, level, message);
        self.worker_logs.insert(0, log.clone());
        self.worker_logs.truncate(20);
        log
    }

    fn note_network_failure(&mut self, error: String) -> Option<String> {
        if self.last_network_error.as_deref() == Some(error.as_str()) {
            return None;
        }

        self.last_network_error = Some(error.clone());
        let log = self.push_log(
            LogLevel::Warning,
            &format!("Backend connectivity degraded: {error}"),
        );
        Some(log.message)
    }

    fn note_network_recovery(&mut self) {
        if self.last_network_error.take().is_some() {
            self.push_log(
                LogLevel::Success,
                "Backend connectivity restored. Polling and heartbeats resumed.",
            );
        }
    }

    fn update_settings(&mut self, settings: WorkerSettings) -> Vec<RuntimeEvent> {
        self.settings = settings;
        self.machine.cpu_limit = self.settings.cpu_limit;
        self.machine.auto_accept_jobs = self.settings.auto_accept_jobs;
        self.machine.background_running = self.settings.background_running;
        self.machine.charging_only = self.settings.charging_only;

        let log = self.push_log(LogLevel::Info, "Worker preferences updated.");
        vec![
            RuntimeEvent::SettingsUpdated(SettingsUpdatedEvent {
                event_type: "settings_updated",
                settings: self.settings.clone(),
            }),
            RuntimeEvent::LogEmitted(ActivityLogEvent {
                event_type: "log_emitted",
                log,
                job_id: None,
            }),
        ]
    }

    fn set_status(&mut self, status: WorkerStatus) -> Vec<RuntimeEvent> {
        self.machine.status = status.clone();
        vec![RuntimeEvent::StatusChanged(WorkerStatusChangedEvent {
            event_type: "worker_status_changed",
            status,
            last_heartbeat_at: self.machine.last_heartbeat_at.clone(),
            uptime_seconds: self.machine.uptime_seconds,
        })]
    }

    fn update_idle_metrics(&mut self) {
        self.metrics.cpu_usage = clamp(7.0 + self.range(-2.0, 2.0), 2.0, 16.0);
        self.metrics.memory_usage = clamp(27.0 + self.range(-2.0, 3.0), 20.0, 38.0);
        self.metrics.temperature_c = clamp(39.0 + self.range(-1.0, 2.0), 36.0, 47.0);
        self.metrics.network_mbps = clamp(96.0 + self.range(-18.0, 22.0), 40.0, 180.0);
        self.metrics.battery_percent = clamp(self.metrics.battery_percent - 0.02, 1.0, 100.0);
    }

    fn update_metrics_for_current_state(&mut self) {
        if let Some(job) = self.active_job.clone() {
            self.metrics.cpu_usage =
                clamp(job.cpu_usage + self.range(-4.0, 6.0), 18.0, self.settings.cpu_limit);
            self.metrics.memory_usage = clamp(job.memory_usage + self.range(-3.0, 4.0), 24.0, 80.0);
            self.metrics.temperature_c = clamp(48.0 + self.range(-2.0, 5.0), 40.0, 79.0);
            self.metrics.network_mbps = clamp(82.0 + self.range(-18.0, 36.0), 20.0, 220.0);
            self.metrics.battery_percent = clamp(self.metrics.battery_percent - 0.06, 1.0, 100.0);
            return;
        }

        self.update_idle_metrics();
    }

    fn range(&mut self, min: f64, max: f64) -> f64 {
        min + (max - min) * next_unit(&mut self.rng_seed)
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkerStatusChangedEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    status: WorkerStatus,
    last_heartbeat_at: Option<String>,
    uptime_seconds: u64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MachineDetectedEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    machine: Machine,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MachineRegisteredEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    machine: Machine,
    settings: WorkerSettings,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct HeartbeatEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    at: String,
    latency_ms: u32,
    uptime_seconds: u64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct JobAssignedEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    job: Job,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct JobProgressEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    job: Job,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct JobCompletedEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    job: Job,
    recent_jobs: Vec<Job>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MetricsUpdateEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    metrics: ResourceMetrics,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct EarningsUpdateEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    earnings: Earnings,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ActivityLogEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    log: JobLog,
    job_id: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SettingsUpdatedEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    settings: WorkerSettings,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    snapshot: WorkerRuntimeSnapshot,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkerErrorEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    message: String,
    recoverable: bool,
}

enum RuntimeEvent {
    StatusChanged(WorkerStatusChangedEvent),
    Heartbeat(HeartbeatEvent),
    JobAssigned(JobAssignedEvent),
    JobProgress(JobProgressEvent),
    LogEmitted(ActivityLogEvent),
    JobCompleted(JobCompletedEvent),
    MetricsUpdated(MetricsUpdateEvent),
    EarningsUpdated(EarningsUpdateEvent),
    SettingsUpdated(SettingsUpdatedEvent),
}

fn emit_events(app: &AppHandle, events: Vec<RuntimeEvent>) {
    for event in events {
        match event {
            RuntimeEvent::StatusChanged(payload) => {
                emit_worker_event(app, STATUS_CHANGED_EVENT, payload)
            }
            RuntimeEvent::Heartbeat(payload) => emit_worker_event(app, HEARTBEAT_EVENT, payload),
            RuntimeEvent::JobAssigned(payload) => emit_worker_event(app, JOB_ASSIGNED_EVENT, payload),
            RuntimeEvent::JobProgress(payload) => emit_worker_event(app, JOB_PROGRESS_EVENT, payload),
            RuntimeEvent::LogEmitted(payload) => emit_worker_event(app, LOG_EMITTED_EVENT, payload),
            RuntimeEvent::JobCompleted(payload) => emit_worker_event(app, JOB_COMPLETED_EVENT, payload),
            RuntimeEvent::MetricsUpdated(payload) => {
                emit_worker_event(app, METRICS_UPDATED_EVENT, payload)
            }
            RuntimeEvent::EarningsUpdated(payload) => {
                emit_worker_event(app, EARNINGS_UPDATED_EVENT, payload)
            }
            RuntimeEvent::SettingsUpdated(payload) => {
                emit_worker_event(app, SETTINGS_UPDATED_EVENT, payload)
            }
        }
    }
}

fn emit_worker_event<T: Serialize + Clone>(app: &AppHandle, event_name: &str, payload: T) {
    let _ = app.emit(event_name, payload);
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AuthSignInResponse {
    user: RemoteUser,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RemoteUser {
    id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MachineRegisterResponse {
    machine: RegisteredMachine,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RegisteredMachine {
    id: String,
    name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct HeartbeatReceipt {
    latency_ms: u32,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RemotePollResponse {
    job: Option<RemoteMarketplaceJob>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RemoteMarketplaceJob {
    id: String,
    machine_id: String,
    code: String,
    #[serde(default)]
    filename: Option<String>,
    #[serde(default)]
    timeout_seconds: Option<u32>,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct RunnerExecuteRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<String>,
    #[serde(rename = "type")]
    job_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    image: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    command: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    script: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    input: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    limits: Option<RunnerExecuteLimits>,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct RunnerExecuteLimits {
    timeout_ms: u32,
    cpus: f64,
    memory_mb: u32,
    pids_limit: u32,
    log_limit_bytes: u32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RunnerExecuteResponse {
    job: RunnerJobRecord,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RunnerJobResponse {
    job: RunnerJobRecord,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RunnerJobRecord {
    id: String,
    #[serde(rename = "type")]
    job_type: String,
    state: String,
    image: String,
    logs: RunnerLogs,
    #[serde(default)]
    result: Option<RunnerExecutionResult>,
    #[serde(default)]
    error: Option<String>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RunnerLogs {
    stdout: String,
    stderr: String,
    truncated: bool,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RunnerExecutionResult {
    exit_code: Option<i32>,
    start_time: String,
    end_time: String,
    duration_ms: u128,
    logs: RunnerLogs,
    artifact_paths: Vec<String>,
    #[serde(default)]
    error: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RunnerHealthResponse {
    ok: bool,
    #[serde(default)]
    docker: Option<RunnerHealthDocker>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RunnerHealthDocker {
    detail: String,
}

#[tauri::command]
pub fn detect_machine(app: AppHandle, manager: tauri::State<'_, WorkerManager>) -> Machine {
    let machine = {
        let mut runtime = manager.runtime.lock().expect("worker runtime poisoned");
        runtime.machine.name = local_machine_name();
        runtime.machine.os = local_os_name();
        runtime.machine.clone()
    };

    emit_worker_event(
        &app,
        MACHINE_DETECTED_EVENT,
        MachineDetectedEvent {
            event_type: "machine_detected",
            machine: machine.clone(),
        },
    );
    manager.emit_snapshot(&app);
    machine
}

#[tauri::command]
pub fn register_machine(
    app: AppHandle,
    manager: tauri::State<'_, WorkerManager>,
    settings: WorkerSettings,
    machine: Machine,
) -> WorkerRuntimeSnapshot {
    let mut runtime = manager.runtime.lock().expect("worker runtime poisoned");
    let mut events = runtime.update_settings(settings);
    runtime.machine.name = machine.name;
    runtime.machine.os = local_os_name();
    runtime.machine.cpu = machine.cpu;
    runtime.machine.gpu = if machine.gpu.trim().is_empty() {
        "Docker-compatible".to_string()
    } else {
        machine.gpu
    };
    runtime.machine.memory_gb = machine.memory_gb;
    runtime.machine.status = WorkerStatus::Offline;
    runtime.registered = true;
    runtime.pause_requested = false;
    let log = runtime.push_log(
        LogLevel::Success,
        "Machine details saved locally. Activate this machine to publish it to the marketplace.",
    );
    events.push(RuntimeEvent::LogEmitted(ActivityLogEvent {
        event_type: "log_emitted",
        log,
        job_id: None,
    }));
    emit_worker_event(
        &app,
        MACHINE_REGISTERED_EVENT,
        MachineRegisteredEvent {
            event_type: "machine_registered",
            machine: runtime.machine.clone(),
            settings: runtime.settings.clone(),
        },
    );

    drop(runtime);
    emit_events(&app, events);
    manager.emit_snapshot(&app);
    manager.snapshot()
}

#[tauri::command]
pub fn start_worker(
    app: AppHandle,
    manager: tauri::State<'_, WorkerManager>,
) -> WorkerRuntimeSnapshot {
    if let Err(error) = manager.ensure_sandbox_runner_ready(&app) {
        let snapshot = {
            let mut runtime = manager.runtime.lock().expect("worker runtime poisoned");
            runtime.machine.status = WorkerStatus::Error;
            let log = runtime.push_log(
                LogLevel::Error,
                &format!("Unable to start Docker runner: {error}"),
            );
            manager.emit_log(&app, log, None);
            runtime.snapshot()
        };
        manager.emit_error(&app, error, false);
        manager.emit_snapshot(&app);
        return snapshot;
    }

    let events = {
        let mut runtime = manager.runtime.lock().expect("worker runtime poisoned");
        if !runtime.registered {
            runtime.machine.status = WorkerStatus::Error;
            let log = runtime.push_log(
                LogLevel::Error,
                "Configure this machine before activating it.",
            );
            manager.emit_log(&app, log, None);
            manager.emit_error(
                &app,
                "Worker start rejected because the machine is not configured.",
                false,
            );
            let snapshot = runtime.snapshot();
            manager.emit_snapshot(&app);
            return snapshot;
        }

        match register_machine_remote(&manager.http, &runtime.api_url, &runtime.machine) {
            Ok((producer_user_id, machine)) => {
                runtime.provider_session = Some(ProviderSession {
                    producer_user_id,
                    provider_id: machine.id.clone(),
                    provider_token: String::new(),
                });
                runtime.machine.id = machine.id;
                runtime.machine.name = machine.name;
            }
            Err(error) => {
                runtime.machine.status = WorkerStatus::Error;
                let log = runtime.push_log(
                    LogLevel::Error,
                    &format!("Unable to publish this machine: {error}"),
                );
                manager.emit_log(&app, log, None);
                manager.emit_error(&app, error, false);
                let snapshot = runtime.snapshot();
                manager.emit_snapshot(&app);
                return snapshot;
            }
        }

        if let Some(session) = runtime.provider_session.clone() {
            if let Err(error) = send_heartbeat(&manager.http, &runtime.api_url, &session, "active") {
                runtime.machine.status = WorkerStatus::Error;
                let log = runtime.push_log(
                    LogLevel::Error,
                    &format!("Unable to activate this machine: {error}"),
                );
                manager.emit_log(&app, log, None);
                manager.emit_error(&app, error, false);
                let snapshot = runtime.snapshot();
                manager.emit_snapshot(&app);
                return snapshot;
            }
        }

        runtime.pause_requested = false;
        runtime.machine.uptime_seconds = 0;
        let mut events = runtime.set_status(WorkerStatus::Idle);
        let log = runtime.push_log(
            LogLevel::Success,
            "Machine activated. It is now published to the marketplace and polling for jobs.",
        );
        events.push(RuntimeEvent::LogEmitted(ActivityLogEvent {
            event_type: "log_emitted",
            log,
            job_id: None,
        }));
        events
    };

    emit_events(&app, events);
    manager.ensure_runner(app.clone());
    manager.emit_snapshot(&app);
    manager.snapshot()
}

#[tauri::command]
pub fn stop_worker(
    app: AppHandle,
    manager: tauri::State<'_, WorkerManager>,
) -> WorkerRuntimeSnapshot {
    manager.stop_runner();
    let cancel_error = cancel_remote_execution(
        &manager.http,
        &mut manager.runtime.lock().expect("worker runtime poisoned"),
        "Worker stopped by owner before completion.",
    );

    let delete_error = {
        let runtime = manager.runtime.lock().expect("worker runtime poisoned");
        runtime
            .provider_session
            .clone()
            .and_then(|session| delete_machine_remote(&manager.http, &runtime.api_url, &session.provider_id).err())
    };

    let events = {
        let mut runtime = manager.runtime.lock().expect("worker runtime poisoned");
        runtime.pause_requested = false;
        runtime.active_execution = None;
        runtime.active_job = None;
        runtime.provider_session = None;
        runtime.machine.id = "node-local-preview".to_string();
        runtime.machine.uptime_seconds = 0;
        runtime.metrics.cpu_usage = 5.0;
        runtime.metrics.memory_usage = 25.0;
        runtime.metrics.heartbeat_latency_ms = 0;
        let mut events = runtime.set_status(WorkerStatus::Offline);
        let message = match (cancel_error.as_ref(), delete_error.as_ref()) {
            (Some(cancel), Some(delete)) => format!("Worker stopped, but cleanup failed. cancel={cancel}; delete={delete}"),
            (Some(cancel), None) => format!("Worker stopped, but remote cancellation failed: {cancel}"),
            (None, Some(delete)) => format!("Worker stopped, but machine removal failed: {delete}"),
            (None, None) => "Worker stopped and machine removed from marketplace.".to_string(),
        };
        let level = if cancel_error.is_some() || delete_error.is_some() {
            LogLevel::Warning
        } else {
            LogLevel::Info
        };
        let log = runtime.push_log(level, &message);
        events.push(RuntimeEvent::MetricsUpdated(MetricsUpdateEvent {
            event_type: "metrics_updated",
            metrics: runtime.metrics.clone(),
        }));
        events.push(RuntimeEvent::LogEmitted(ActivityLogEvent {
            event_type: "log_emitted",
            log,
            job_id: None,
        }));
        events
    };

    emit_events(&app, events);
    if let Some(error) = cancel_error {
        manager.emit_error(&app, error, true);
    }
    if let Some(error) = delete_error {
        manager.emit_error(&app, error, true);
    }
    manager.emit_snapshot(&app);
    manager.snapshot()
}

#[tauri::command]
pub fn pause_worker(
    app: AppHandle,
    manager: tauri::State<'_, WorkerManager>,
) -> WorkerRuntimeSnapshot {
    let events = {
        let mut runtime = manager.runtime.lock().expect("worker runtime poisoned");
        runtime.pause_requested = true;
        let status = if runtime.active_execution.is_some() {
            WorkerStatus::Busy
        } else {
            WorkerStatus::Paused
        };
        let mut events = runtime.set_status(status);
        let message = if runtime.active_execution.is_some() {
            "Pause requested. The current Docker job will finish, then polling will stop."
        } else {
            "Worker paused. No new jobs will be accepted."
        };
        let log = runtime.push_log(LogLevel::Warning, message);
        events.push(RuntimeEvent::LogEmitted(ActivityLogEvent {
            event_type: "log_emitted",
            log,
            job_id: None,
        }));
        events
    };

    emit_events(&app, events);
    manager.emit_snapshot(&app);
    manager.snapshot()
}

#[tauri::command]
pub fn resume_worker(
    app: AppHandle,
    manager: tauri::State<'_, WorkerManager>,
) -> WorkerRuntimeSnapshot {
    let events = {
        let mut runtime = manager.runtime.lock().expect("worker runtime poisoned");
        runtime.pause_requested = false;
        let status = if runtime.active_execution.is_some() {
            WorkerStatus::Busy
        } else {
            WorkerStatus::Idle
        };
        let mut events = runtime.set_status(status);
        let log = runtime.push_log(LogLevel::Success, "Worker resumed.");
        events.push(RuntimeEvent::LogEmitted(ActivityLogEvent {
            event_type: "log_emitted",
            log,
            job_id: None,
        }));
        events
    };

    emit_events(&app, events);
    manager.ensure_runner(app.clone());
    manager.emit_snapshot(&app);
    manager.snapshot()
}

#[tauri::command]
pub fn get_worker_status(manager: tauri::State<'_, WorkerManager>) -> WorkerRuntimeSnapshot {
    manager.snapshot()
}

#[tauri::command]
pub fn update_worker_settings(
    app: AppHandle,
    manager: tauri::State<'_, WorkerManager>,
    settings: WorkerSettings,
) -> WorkerRuntimeSnapshot {
    let events = {
        let mut runtime = manager.runtime.lock().expect("worker runtime poisoned");
        runtime.update_settings(settings)
    };
    emit_events(&app, events);
    manager.emit_snapshot(&app);
    manager.snapshot()
}

#[tauri::command]
pub fn emergency_stop(
    app: AppHandle,
    manager: tauri::State<'_, WorkerManager>,
) -> WorkerRuntimeSnapshot {
    manager.stop_runner();
    let cancel_error = cancel_remote_execution(
        &manager.http,
        &mut manager.runtime.lock().expect("worker runtime poisoned"),
        "Emergency stop requested by owner.",
    );

    let events = {
        let mut runtime = manager.runtime.lock().expect("worker runtime poisoned");
        runtime.pause_requested = false;
        runtime.active_execution = None;
        runtime.active_job = None;
        runtime.machine.uptime_seconds = 0;
        runtime.metrics.cpu_usage = 3.0;
        runtime.metrics.memory_usage = 22.0;
        runtime.metrics.heartbeat_latency_ms = 0;
        let mut events = runtime.set_status(WorkerStatus::Offline);
        let message = match cancel_error {
            Some(ref error) => format!("Emergency disconnect complete, but job cleanup failed: {error}"),
            None => "Emergency disconnect complete. Active job was canceled and backend notified.".to_string(),
        };
        let log = runtime.push_log(LogLevel::Error, &message);
        events.push(RuntimeEvent::MetricsUpdated(MetricsUpdateEvent {
            event_type: "metrics_updated",
            metrics: runtime.metrics.clone(),
        }));
        events.push(RuntimeEvent::LogEmitted(ActivityLogEvent {
            event_type: "log_emitted",
            log,
            job_id: None,
        }));
        events
    };

    emit_events(&app, events);
    if let Some(error) = cancel_error {
        manager.emit_error(&app, error, true);
    }
    manager.emit_snapshot(&app);
    manager.snapshot()
}

#[tauri::command]
pub fn check_docker_health() -> DockerHealth {
    match run_shell("docker version --format '{{.Server.Version}}'", None) {
        Ok(version) => DockerHealth {
            ok: true,
            detail: format!("Docker daemon available ({})", version.trim()),
        },
        Err(error) => DockerHealth {
            ok: false,
            detail: format!("Docker unavailable: {error}"),
        },
    }
}

#[tauri::command]
pub fn get_sandbox_runner_status(
    manager: tauri::State<'_, WorkerManager>,
) -> SandboxRunnerStatus {
    manager.sandbox_status()
}

#[tauri::command]
pub fn start_sandbox_runner(
    app: AppHandle,
    manager: tauri::State<'_, WorkerManager>,
) -> Result<SandboxRunnerStatus, String> {
    manager.ensure_sandbox_runner_ready(&app)?;
    Ok(manager.sandbox_status())
}

#[tauri::command]
pub fn stop_sandbox_runner(
    app: AppHandle,
    manager: tauri::State<'_, WorkerManager>,
) -> Result<SandboxRunnerStatus, String> {
    let stopped_managed_process = {
        let mut child_guard = manager
            .sandbox_runner
            .lock()
            .expect("sandbox runner process poisoned");
        if let Some(mut child) = child_guard.take() {
            let _ = child.kill();
            let _ = child.wait();
            true
        } else {
            false
        }
    };

    {
        let mut runtime = manager.runtime.lock().expect("worker runtime poisoned");
        let message = if stopped_managed_process {
            "Docker sandbox runner stopped."
        } else {
            "No app-managed sandbox runner process was active."
        };
        let log = runtime.push_log(LogLevel::Warning, message);
        manager.emit_log(&app, log, None);
    }
    manager.emit_snapshot(&app);

    Ok(manager.sandbox_status())
}

fn register_machine_remote(
    http: &Client,
    api_url: &str,
    machine: &Machine,
) -> Result<(String, RegisteredMachine), String> {
    let normalized_machine_name = local_machine_name()
        .to_lowercase()
        .chars()
        .map(|char| if char.is_ascii_alphanumeric() { char } else { '-' })
        .collect::<String>();
    let username = format!("producer-{}", normalized_machine_name.trim_matches('-'));

    let auth: AuthSignInResponse = post_json(
        http,
        &format!("{api_url}/api/auth/sign-in"),
        HeaderMap::new(),
        &json!({
            "username": username,
            "displayName": machine.name,
            "role": "producer"
        }),
    )?;

    let registration: MachineRegisterResponse = post_json(
        http,
        &format!("{api_url}/api/machines/register"),
        HeaderMap::new(),
        &json!({
            "producerUserId": auth.user.id,
            "name": machine.name,
            "cpu": machine.cpu,
            "gpu": machine.gpu,
            "ramGb": machine.memory_gb
        }),
    )?;

    Ok((auth.user.id, registration.machine))
}

fn delete_machine_remote(http: &Client, api_url: &str, machine_id: &str) -> Result<Value, String> {
    delete_json(
        http,
        &format!("{api_url}/api/machines/{machine_id}"),
        HeaderMap::new(),
    )
}

fn send_heartbeat(
    http: &Client,
    api_url: &str,
    session: &ProviderSession,
    status: &str,
) -> Result<HeartbeatReceipt, String> {
    let started = Instant::now();
    let _: Value = patch_json(
        http,
        &format!("{api_url}/api/machines/{}/status", session.provider_id),
        auth_headers(session)?,
        &json!({
            "status": status
        }),
    )?;

    Ok(HeartbeatReceipt {
        latency_ms: started.elapsed().as_millis().min(u128::from(u32::MAX)) as u32,
    })
}

fn poll_for_assignment(http: &Client, runtime: &mut WorkerRuntime) -> Result<Vec<RuntimeEvent>, String> {
    let session = runtime
        .provider_session
        .clone()
        .ok_or_else(|| "worker is not registered with a provider session".to_string())?;
    let response: RemotePollResponse = get_json(
        http,
        &format!(
            "{}/api/machines/{}/jobs/next",
            runtime.api_url, session.provider_id
        ),
        auth_headers(&session)?,
    )?;

    let Some(job) = response.job else {
        return Ok(vec![]);
    };

    let start_path = format!("{}/api/jobs/{}/start", runtime.api_url, job.id);
    let _: Value = patch_json(
        http,
        &start_path,
        auth_headers(&session)?,
        &json!({
            "machineId": session.provider_id
        }),
    )?;

    let runner_request = runner_request_for_marketplace_job(&job);
    let runner_response: RunnerExecuteResponse = post_json(
        http,
        &format!("{}/jobs/execute", runtime.runner_url),
        runner_headers()?,
        &runner_request,
    )?;

    let started_at = now();
    let estimated_completion_at = (Utc::now() + ChronoDuration::seconds(30))
        .to_rfc3339_opts(SecondsFormat::Millis, true);
    let ui_job = Job {
        id: job.id.clone(),
        name: job.filename.clone().unwrap_or_else(|| "script.py".to_string()),
        job_type: map_marketplace_job_type(),
        status: JobStatus::Running,
        progress: initial_progress_for_state(&runner_response.job.state),
        started_at: Some(started_at.clone()),
        estimated_completion_at: Some(estimated_completion_at),
        earnings: 0.0,
        cpu_usage: clamp(runtime.settings.cpu_limit * 0.72, 18.0, runtime.settings.cpu_limit),
        memory_usage: 48.0,
        logs: build_ui_logs(&runner_response.job.logs.stdout, &runner_response.job.logs.stderr),
        execution_output: Some("Python execution started in Docker.".to_string()),
        execution_error: None,
    };

    runtime.active_execution = Some(ActiveExecution {
        remote_job_id: job.id.clone(),
        runner_job_id: runner_response.job.id.clone(),
        last_stdout_len: runner_response.job.logs.stdout.len(),
        last_stderr_len: runner_response.job.logs.stderr.len(),
        last_state: runner_response.job.state.clone(),
    });
    runtime.active_job = Some(ui_job.clone());
    runtime.machine.status = WorkerStatus::Busy;
    runtime.note_network_recovery();

    let assign_log = runtime.push_log(
        LogLevel::Success,
        &format!(
            "Backend assigned {}. Docker runner accepted job {} for execution.",
            ui_job.name, runner_response.job.id
        ),
    );
    let progress_log = runtime.push_log(
        LogLevel::Info,
        &format!("Job {} is running in Docker image {}.", job.id, runner_response.job.image),
    );

    Ok(vec![
        RuntimeEvent::StatusChanged(WorkerStatusChangedEvent {
            event_type: "worker_status_changed",
            status: WorkerStatus::Busy,
            last_heartbeat_at: runtime.machine.last_heartbeat_at.clone(),
            uptime_seconds: runtime.machine.uptime_seconds,
        }),
        RuntimeEvent::JobAssigned(JobAssignedEvent {
            event_type: "job_assigned",
            job: ui_job.clone(),
        }),
        RuntimeEvent::JobProgress(JobProgressEvent {
            event_type: "job_progress",
            job: ui_job,
        }),
        RuntimeEvent::LogEmitted(ActivityLogEvent {
            event_type: "log_emitted",
            log: assign_log,
            job_id: Some(job.id.clone()),
        }),
        RuntimeEvent::LogEmitted(ActivityLogEvent {
            event_type: "log_emitted",
            log: progress_log,
            job_id: Some(job.id),
        }),
    ])
}

fn sync_active_execution(
    http: &Client,
    runtime: &mut WorkerRuntime,
    execution: ActiveExecution,
) -> Result<Vec<RuntimeEvent>, String> {
    let runner_response: RunnerJobResponse = get_json(
        http,
        &format!("{}/jobs/{}", runtime.runner_url, execution.runner_job_id),
        HeaderMap::new(),
    )?;
    let session = runtime
        .provider_session
        .clone()
        .ok_or_else(|| "worker lost provider session during execution".to_string())?;

    let runner_job = runner_response.job;
    let stdout_delta = slice_delta(&runner_job.logs.stdout, execution.last_stdout_len);
    let stderr_delta = slice_delta(&runner_job.logs.stderr, execution.last_stderr_len);

    if let Some(active_job) = runtime.active_job.as_mut() {
        active_job.progress = progress_for_runner_state(&runner_job.state, active_job.progress);
        active_job.logs = build_ui_logs(&runner_job.logs.stdout, &runner_job.logs.stderr);
        active_job.cpu_usage = clamp(runtime.settings.cpu_limit * 0.78, 18.0, runtime.settings.cpu_limit);
        active_job.memory_usage = 50.0;
        active_job.execution_output = (!runner_job.logs.stdout.trim().is_empty())
            .then(|| limit_output(&runner_job.logs.stdout));
        active_job.execution_error = (!runner_job.logs.stderr.trim().is_empty())
            .then(|| limit_output(&runner_job.logs.stderr));
    }

    let progress_message = build_progress_message(&runner_job, &stdout_delta, &stderr_delta);
    if progress_message.as_deref().is_some() || execution.last_state != runner_job.state {
        let message = progress_message.unwrap_or_else(|| format!("Runner state changed to {}", runner_job.state));
        let _: Value = patch_json(
            http,
            &format!("{}/api/jobs/{}/progress", runtime.api_url, execution.remote_job_id),
            auth_headers(&session)?,
            &json!({
                "machineId": session.provider_id,
                "stdout": if stdout_delta.trim().is_empty() { Value::Null } else { Value::String(limit_output(&stdout_delta)) },
                "stderr": if stderr_delta.trim().is_empty() { Value::Null } else { Value::String(limit_output(&stderr_delta)) },
                "message": limit_output(&message)
            }),
        )?;
    }

    if let Some(active_execution) = runtime.active_execution.as_mut() {
        active_execution.last_stdout_len = runner_job.logs.stdout.len();
        active_execution.last_stderr_len = runner_job.logs.stderr.len();
        active_execution.last_state = runner_job.state.clone();
    }

    let Some(active_job) = runtime.active_job.clone() else {
        return Ok(vec![]);
    };

    let mut events = Vec::new();
    if !stdout_delta.is_empty() {
        let log = runtime.push_log(
            LogLevel::Info,
            &format!("stdout {}: {}", execution.remote_job_id, limit_output(&stdout_delta)),
        );
        events.push(RuntimeEvent::LogEmitted(ActivityLogEvent {
            event_type: "log_emitted",
            log,
            job_id: Some(execution.remote_job_id.clone()),
        }));
    }
    if !stderr_delta.is_empty() {
        let log = runtime.push_log(
            LogLevel::Warning,
            &format!("stderr {}: {}", execution.remote_job_id, limit_output(&stderr_delta)),
        );
        events.push(RuntimeEvent::LogEmitted(ActivityLogEvent {
            event_type: "log_emitted",
            log,
            job_id: Some(execution.remote_job_id.clone()),
        }));
    }

    if is_terminal_state(&runner_job.state) {
        if is_successful_runner_completion(&runner_job) {
            let _: Value = patch_json(
                http,
                &format!("{}/api/jobs/{}/complete", runtime.api_url, execution.remote_job_id),
                auth_headers(&session)?,
                &json!({
                    "machineId": session.provider_id,
                    "stdout": runner_job
                        .result
                        .as_ref()
                        .map(|result| result.logs.stdout.clone())
                        .unwrap_or_else(|| runner_job.logs.stdout.clone()),
                    "stderr": runner_job
                        .result
                        .as_ref()
                        .map(|result| result.logs.stderr.clone())
                        .unwrap_or_else(|| runner_job.logs.stderr.clone()),
                    "exitCode": runner_job
                        .result
                        .as_ref()
                        .and_then(|result| result.exit_code)
                        .unwrap_or(0)
                }),
            )?;

            let mut completed_job = active_job.clone();
            completed_job.status = JobStatus::Completed;
            completed_job.progress = 100.0;
            completed_job.earnings = 0.0;
            completed_job.execution_output = Some(limit_output(
                &runner_job
                    .result
                    .as_ref()
                    .map(|result| result.logs.stdout.clone())
                    .unwrap_or_else(|| runner_job.logs.stdout.clone()),
            ));
            completed_job.execution_error = runner_job
                .result
                .as_ref()
                .and_then(|result| result.error.clone());

            runtime.active_execution = None;
            runtime.active_job = None;
            runtime.machine.status = if runtime.pause_requested {
                WorkerStatus::Paused
            } else {
                WorkerStatus::Idle
            };
            runtime.recent_jobs.insert(0, completed_job.clone());
            runtime.recent_jobs.truncate(8);
            runtime.earnings.lifetime = money(runtime.earnings.lifetime + completed_job.earnings);
            runtime.earnings.pending = money(runtime.earnings.pending + completed_job.earnings);
            runtime.earnings.today = money(runtime.earnings.today + completed_job.earnings);
            runtime.earnings.completed_jobs += 1;
            if let Some(point) = runtime.earnings.history.last_mut() {
                point.amount = money(point.amount + completed_job.earnings);
            }
            let log = runtime.push_log(
                LogLevel::Success,
                &format!(
                    "{} completed in Docker. exitCode={}.",
                    completed_job.name,
                    runner_job
                        .result
                        .as_ref()
                        .and_then(|result| result.exit_code)
                        .unwrap_or(0)
                ),
            );
            events.push(RuntimeEvent::StatusChanged(WorkerStatusChangedEvent {
                event_type: "worker_status_changed",
                status: runtime.machine.status.clone(),
                last_heartbeat_at: runtime.machine.last_heartbeat_at.clone(),
                uptime_seconds: runtime.machine.uptime_seconds,
            }));
            events.push(RuntimeEvent::LogEmitted(ActivityLogEvent {
                event_type: "log_emitted",
                log,
                job_id: Some(execution.remote_job_id.clone()),
            }));
            events.push(RuntimeEvent::JobCompleted(JobCompletedEvent {
                event_type: "job_completed",
                job: completed_job,
                recent_jobs: runtime.recent_jobs.clone(),
            }));
            return Ok(events);
        }

        let failure = runner_failure_message(&runner_job);
        let _: Value = patch_json(
            http,
            &format!("{}/api/jobs/{}/fail", runtime.api_url, execution.remote_job_id),
            auth_headers(&session)?,
            &json!({
                "machineId": session.provider_id,
                "error": limit_output(&failure)
            }),
        )?;

        let mut failed_job = active_job.clone();
        failed_job.status = JobStatus::Failed;
        failed_job.progress = 100.0;
        failed_job.execution_error = Some(limit_output(&failure));

        runtime.active_execution = None;
        runtime.active_job = None;
        runtime.machine.status = if runtime.pause_requested {
            WorkerStatus::Paused
        } else {
            WorkerStatus::Idle
        };
        runtime.recent_jobs.insert(0, failed_job.clone());
        runtime.recent_jobs.truncate(8);
        let log = runtime.push_log(
            LogLevel::Error,
            &format!("{} failed in Docker: {}.", failed_job.name, limit_output(&failure)),
        );
        events.push(RuntimeEvent::StatusChanged(WorkerStatusChangedEvent {
            event_type: "worker_status_changed",
            status: runtime.machine.status.clone(),
            last_heartbeat_at: runtime.machine.last_heartbeat_at.clone(),
            uptime_seconds: runtime.machine.uptime_seconds,
        }));
        events.push(RuntimeEvent::LogEmitted(ActivityLogEvent {
            event_type: "log_emitted",
            log,
            job_id: Some(execution.remote_job_id.clone()),
        }));
        events.push(RuntimeEvent::JobCompleted(JobCompletedEvent {
            event_type: "job_completed",
            job: failed_job,
            recent_jobs: runtime.recent_jobs.clone(),
        }));
        return Ok(events);
    }

    events.push(RuntimeEvent::JobProgress(JobProgressEvent {
        event_type: "job_progress",
        job: active_job,
    }));
    Ok(events)
}

fn cancel_remote_execution(
    http: &Client,
    runtime: &mut WorkerRuntime,
    reason: &str,
) -> Option<String> {
    let execution = runtime.active_execution.clone()?;
    let session = runtime.provider_session.clone()?;

    let runner_cancel_result: Result<Value, String> = post_json(
        http,
        &format!("{}/jobs/{}/cancel", runtime.runner_url, execution.runner_job_id),
        runner_headers().unwrap_or_else(|_| HeaderMap::new()),
        &json!({}),
    );

    let backend_fail_result: Result<Value, String> = patch_json(
        http,
        &format!("{}/api/jobs/{}/fail", runtime.api_url, execution.remote_job_id),
        auth_headers(&session).unwrap_or_else(|_| HeaderMap::new()),
        &json!({
            "machineId": session.provider_id,
            "error": reason
        }),
    );

    runtime.active_execution = None;
    runtime.active_job = None;

    match (runner_cancel_result, backend_fail_result) {
        (Ok(_), Ok(_)) => None,
        (runner, backend) => Some(format!(
            "runner cancel: {}; backend fail: {}",
            runner.err().unwrap_or_else(|| "ok".to_string()),
            backend.err().unwrap_or_else(|| "ok".to_string())
        )),
    }
}

fn runner_request_for_marketplace_job(job: &RemoteMarketplaceJob) -> RunnerExecuteRequest {
    RunnerExecuteRequest {
        id: Some(job.id.clone()),
        job_type: "python_script".to_string(),
        image: Some("python:3.12-slim".to_string()),
        command: None,
        script: Some(job.code.clone()),
        input: Some(json!({
            "jobId": job.id,
            "machineId": job.machine_id,
            "filename": job.filename.clone().unwrap_or_else(|| "script.py".to_string())
        })),
        limits: Some(RunnerExecuteLimits {
            timeout_ms: job.timeout_seconds.unwrap_or(60).saturating_mul(1000),
            cpus: 1.0,
            memory_mb: 512,
            pids_limit: 128,
            log_limit_bytes: 64 * 1024,
        }),
    }
}

fn map_marketplace_job_type() -> JobType {
    JobType::Compile
}

fn build_progress_message(
    runner_job: &RunnerJobRecord,
    stdout_delta: &str,
    stderr_delta: &str,
) -> Option<String> {
    if !stderr_delta.trim().is_empty() {
        return Some(format!("stderr: {}", limit_output(stderr_delta)));
    }

    if !stdout_delta.trim().is_empty() {
        return Some(format!("stdout: {}", limit_output(stdout_delta)));
    }

    if runner_job.state == "pulling_image" {
        return Some("Pulling approved Docker image for execution".to_string());
    }

    if runner_job.state == "running" {
        return Some("Python job is running inside Docker".to_string());
    }

    None
}

fn build_ui_logs(stdout: &str, stderr: &str) -> Vec<JobLog> {
    let mut logs = Vec::new();

    for line in stderr.lines().rev().take(6) {
        if !line.trim().is_empty() {
            logs.push(log_with_text(LogLevel::Error, line));
        }
    }
    for line in stdout.lines().rev().take(6) {
        if !line.trim().is_empty() {
            logs.push(log_with_text(LogLevel::Info, line));
        }
    }

    logs.truncate(12);
    logs
}

fn initial_progress_for_state(state: &str) -> f64 {
    match state {
        "queued" => 5.0,
        "pulling_image" => 12.0,
        "running" => 25.0,
        _ => 10.0,
    }
}

fn progress_for_runner_state(state: &str, current: f64) -> f64 {
    match state {
        "queued" => current.max(5.0),
        "pulling_image" => current.max(18.0),
        "running" => (current + 18.0).min(92.0),
        "completed" | "failed" | "timed_out" => 100.0,
        _ => current,
    }
}

fn is_terminal_state(state: &str) -> bool {
    matches!(state, "completed" | "failed" | "timed_out")
}

fn is_successful_runner_completion(job: &RunnerJobRecord) -> bool {
    job.state == "completed"
        && job
            .result
            .as_ref()
            .and_then(|result| result.exit_code)
            .unwrap_or(1)
            == 0
        && job.result.as_ref().and_then(|result| result.error.clone()).is_none()
}

fn runner_failure_message(job: &RunnerJobRecord) -> String {
    job.result
        .as_ref()
        .and_then(|result| result.error.clone())
        .or_else(|| job.error.clone())
        .or_else(|| {
            job.result.as_ref().map(|result| {
                format!(
                    "Runner ended in {} with exit code {:?}. stderr={}",
                    job.state,
                    result.exit_code,
                    limit_output(&result.logs.stderr)
                )
            })
        })
        .unwrap_or_else(|| {
            format!(
                "Runner ended in {}. stderr={}",
                job.state,
                limit_output(&job.logs.stderr)
            )
        })
}

fn post_json<T: DeserializeOwned, B: Serialize>(
    http: &Client,
    url: &str,
    headers: HeaderMap,
    body: &B,
) -> Result<T, String> {
    let response = http
        .post(url)
        .headers(headers)
        .json(body)
        .send()
        .map_err(|error| format!("POST {url} failed: {error}"))?;

    parse_json_response(response, url)
}

fn patch_json<T: DeserializeOwned, B: Serialize>(
    http: &Client,
    url: &str,
    headers: HeaderMap,
    body: &B,
) -> Result<T, String> {
    let response = http
        .patch(url)
        .headers(headers)
        .json(body)
        .send()
        .map_err(|error| format!("PATCH {url} failed: {error}"))?;

    parse_json_response(response, url)
}

fn delete_json<T: DeserializeOwned>(
    http: &Client,
    url: &str,
    headers: HeaderMap,
) -> Result<T, String> {
    let response = http
        .delete(url)
        .headers(headers)
        .send()
        .map_err(|error| format!("DELETE {url} failed: {error}"))?;

    parse_json_response(response, url)
}

fn get_json<T: DeserializeOwned>(
    http: &Client,
    url: &str,
    headers: HeaderMap,
) -> Result<T, String> {
    let response = http
        .get(url)
        .headers(headers)
        .send()
        .map_err(|error| format!("GET {url} failed: {error}"))?;

    parse_json_response(response, url)
}

fn parse_json_response<T: DeserializeOwned>(
    response: reqwest::blocking::Response,
    url: &str,
) -> Result<T, String> {
    let status = response.status();
    let body = response
        .text()
        .map_err(|error| format!("Unable to read response from {url}: {error}"))?;

    if !status.is_success() {
        return Err(format!(
            "{} returned {}: {}",
            url,
            status,
            limit_output(&body)
        ));
    }

    serde_json::from_str(&body)
        .map_err(|error| format!("Unable to decode JSON from {url}: {error}; body={}", limit_output(&body)))
}

fn auth_headers(_session: &ProviderSession) -> Result<HeaderMap, String> {
    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    Ok(headers)
}

fn runner_headers() -> Result<HeaderMap, String> {
    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    Ok(headers)
}

fn seed_recent_jobs() -> Vec<Job> {
    vec![
        completed_job(
            "job-9812",
            "Protein fold sampling shard",
            JobType::Simulation,
            8.72,
            94,
            63,
        ),
        completed_job(
            "job-9721",
            "Product image render batch",
            JobType::Render,
            6.25,
            186,
            151,
        ),
        completed_job(
            "job-9655",
            "Search index compile sweep",
            JobType::Compile,
            4.18,
            390,
            365,
        ),
    ]
}

fn completed_job(
    id: &str,
    name: &str,
    job_type: JobType,
    earnings: f64,
    started_minutes_ago: i64,
    completed_minutes_ago: i64,
) -> Job {
    Job {
        id: id.to_string(),
        name: name.to_string(),
        job_type,
        status: JobStatus::Completed,
        progress: 100.0,
        started_at: Some(
            (Utc::now() - ChronoDuration::minutes(started_minutes_ago))
                .to_rfc3339_opts(SecondsFormat::Millis, true),
        ),
        estimated_completion_at: Some(
            (Utc::now() - ChronoDuration::minutes(completed_minutes_ago))
                .to_rfc3339_opts(SecondsFormat::Millis, true),
        ),
        earnings,
        cpu_usage: 55.0,
        memory_usage: 39.0,
        logs: vec![],
        execution_output: Some("Historical completed job.".to_string()),
        execution_error: None,
    }
}

fn worker_runner_dir() -> Result<PathBuf, String> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let repo_root = manifest_dir
        .parent()
        .ok_or_else(|| "unable to resolve repository root".to_string())?;
    let worker_dir = repo_root.join("worker-runner");
    if worker_dir.join("package.json").exists() {
        Ok(worker_dir)
    } else {
        Err(format!(
            "worker-runner package not found at {}",
            worker_dir.to_string_lossy()
        ))
    }
}

fn repo_root() -> Option<PathBuf> {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).parent().map(PathBuf::from)
}

fn repo_env(name: &str) -> Option<String> {
    if let Ok(value) = std::env::var(name) {
        let trimmed = value.trim();
        if !trimmed.is_empty() {
            return Some(trimmed.to_string());
        }
    }

    let root = repo_root()?;
    let env_path = root.join(".env");
    let contents = fs::read_to_string(env_path).ok()?;

    contents.lines().find_map(|line| {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            return None;
        }
        let (key, value) = trimmed.split_once('=')?;
        if key.trim() != name {
            return None;
        }

        let value = value.trim().trim_matches('"').trim_matches('\'');
        (!value.is_empty()).then(|| value.to_string())
    })
}

fn spawn_shell(command: &str, cwd: Option<PathBuf>) -> Result<Child, String> {
    let mut process = shell_command(command);
    if let Some(cwd) = cwd {
        process.current_dir(cwd);
    }
    process
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("unable to spawn `{command}`: {error}"))
}

fn run_shell(command: &str, cwd: Option<PathBuf>) -> Result<String, String> {
    let mut process = shell_command(command);
    if let Some(cwd) = cwd {
        process.current_dir(cwd);
    }
    let output = process
        .stdin(Stdio::null())
        .output()
        .map_err(|error| format!("unable to run `{command}`: {error}"))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(if stderr.is_empty() {
            format!("command exited with {}", output.status)
        } else {
            stderr
        })
    }
}

fn shell_command(command: &str) -> Command {
    if cfg!(windows) {
        let mut process = Command::new("cmd.exe");
        process.arg("/C").arg(command);
        process
    } else {
        let mut process = Command::new("/bin/zsh");
        process.arg("-lc").arg(command);
        process
    }
}

fn parse_host_port(url: &str) -> Option<(String, u16)> {
    let host_port = url.split('/').next()?.trim();
    let mut pieces = host_port.split(':');
    let host = pieces.next()?.to_string();
    let port = pieces.next()?.parse::<u16>().ok()?;
    Some((host, port))
}

fn local_machine_name() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "Local provider node".to_string())
}

fn local_os_name() -> String {
    match std::env::consts::OS {
        "macos" => "macOS".to_string(),
        "windows" => "Windows".to_string(),
        "linux" => "Linux".to_string(),
        other => other.to_string(),
    }
}

fn log(id: &str, level: LogLevel, message: &str) -> JobLog {
    JobLog {
        id: id.to_string(),
        at: now(),
        level,
        message: message.to_string(),
    }
}

fn log_with_text(level: LogLevel, message: &str) -> JobLog {
    log(
        &format!("log-{}", Utc::now().timestamp_millis()),
        level,
        message,
    )
}

fn log_with_random_id(seed: &mut u64, level: LogLevel, message: &str) -> JobLog {
    let suffix = (next_unit(seed) * 1_000_000.0).round() as u64;
    log(
        &format!("log-{}-{}", Utc::now().timestamp_millis(), suffix),
        level,
        message,
    )
}

fn now() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn next_unit(seed: &mut u64) -> f64 {
    *seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
    ((*seed >> 33) as f64) / (u32::MAX as f64)
}

fn clamp(value: f64, min: f64, max: f64) -> f64 {
    value.max(min).min(max)
}

fn money(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

fn cents_from_dollars(value: f64) -> u32 {
    (value * 100.0).round().max(0.0) as u32
}

fn slice_delta<'a>(value: &'a str, from: usize) -> &'a str {
    if from >= value.len() {
        ""
    } else {
        &value[from..]
    }
}

fn limit_output(value: &str) -> String {
    let normalized = value.split_whitespace().collect::<Vec<_>>().join(" ");
    normalized.chars().take(2000).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fallback_marketplace_job_becomes_python_script() {
        let job = RemoteMarketplaceJob {
            id: "job-1".to_string(),
            machine_id: "machine-1".to_string(),
            code: "print('hello')".to_string(),
            filename: Some("hello.py".to_string()),
            timeout_seconds: Some(30),
        };

        let request = runner_request_for_marketplace_job(&job);

        assert_eq!(request.job_type, "python_script");
        assert!(request.script.unwrap_or_default().contains("print('hello')"));
    }

    #[test]
    fn terminal_runner_states_map_to_completion() {
        assert!(is_terminal_state("completed"));
        assert!(is_terminal_state("failed"));
        assert!(is_terminal_state("timed_out"));
        assert!(!is_terminal_state("running"));
    }
}

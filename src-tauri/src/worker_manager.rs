use std::{
    sync::{Arc, Mutex},
    time::Duration,
};

use chrono::{Duration as ChronoDuration, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
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

#[derive(Clone)]
pub struct WorkerManager {
    runtime: Arc<Mutex<WorkerRuntime>>,
    task: Arc<Mutex<Option<JoinHandle<()>>>>,
}

impl WorkerManager {
    pub fn new() -> Self {
        Self {
            runtime: Arc::new(Mutex::new(WorkerRuntime::new())),
            task: Arc::new(Mutex::new(None)),
        }
    }

    fn snapshot(&self) -> WorkerRuntimeSnapshot {
        self.runtime.lock().expect("worker runtime poisoned").snapshot()
    }

    fn emit_snapshot(&self, app: &AppHandle) {
        emit_worker_event(app, SNAPSHOT_EVENT, SnapshotEvent { event_type: "snapshot", snapshot: self.snapshot() });
    }

    fn ensure_runner(&self, app: AppHandle) {
        let mut task = self.task.lock().expect("worker task poisoned");
        if task.is_some() {
            return;
        }

        let manager = self.clone();
        *task = Some(tauri::async_runtime::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_millis(1900)).await;
                manager.tick(&app);
            }
        }));
    }

    fn stop_runner(&self) {
        if let Some(task) = self.task.lock().expect("worker task poisoned").take() {
            task.abort();
        }
    }

    fn tick(&self, app: &AppHandle) {
        let events = {
            let mut runtime = self.runtime.lock().expect("worker runtime poisoned");
            runtime.tick()
        };

        emit_events(app, events);
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
    job_counter: u32,
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
            allowed_job_types: vec![JobType::Render, JobType::Simulation, JobType::BatchInference, JobType::Compile],
        };

        Self {
            registered: false,
            machine: Machine {
                id: "node-local-preview".to_string(),
                name: local_machine_name(),
                os: local_os_name(),
                cpu: "Local CPU provider".to_string(),
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
            recent_jobs: seed_recent_jobs(),
            earnings: Earnings {
                lifetime: 284.46,
                pending: 42.83,
                today: 14.21,
                completed_jobs: 37,
                history: vec![
                    EarningsPoint { label: "Mon".into(), amount: 11.42 },
                    EarningsPoint { label: "Tue".into(), amount: 18.74 },
                    EarningsPoint { label: "Wed".into(), amount: 9.6 },
                    EarningsPoint { label: "Thu".into(), amount: 22.18 },
                    EarningsPoint { label: "Fri".into(), amount: 16.91 },
                    EarningsPoint { label: "Sat".into(), amount: 27.35 },
                    EarningsPoint { label: "Sun".into(), amount: 14.7 },
                ],
            },
            settings,
            network_online: true,
            worker_logs: vec![log("log-boot", LogLevel::Info, "Control plane ready. Worker is waiting for a secure session.")],
            rng_seed: 0xC0FFEE,
            job_counter: 9900,
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

    fn update_settings(&mut self, settings: WorkerSettings) -> Vec<RuntimeEvent> {
        self.settings = settings;
        self.machine.cpu_limit = self.settings.cpu_limit;
        self.machine.auto_accept_jobs = self.settings.auto_accept_jobs;
        self.machine.background_running = self.settings.background_running;
        self.machine.charging_only = self.settings.charging_only;

        let log = self.push_log(LogLevel::Info, "Worker preferences updated.");
        vec![
            RuntimeEvent::SettingsUpdated(SettingsUpdatedEvent { event_type: "settings_updated", settings: self.settings.clone() }),
            RuntimeEvent::LogEmitted(ActivityLogEvent { event_type: "log_emitted", log, job_id: None }),
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

    fn tick(&mut self) -> Vec<RuntimeEvent> {
        if matches!(self.machine.status, WorkerStatus::Offline | WorkerStatus::Paused | WorkerStatus::Error) {
            self.metrics.cpu_usage = clamp(self.metrics.cpu_usage + self.range(-2.0, 2.0), 2.0, 14.0);
            self.metrics.memory_usage = clamp(self.metrics.memory_usage + self.range(-1.0, 1.0), 20.0, 34.0);
            self.metrics.battery_percent = clamp(self.metrics.battery_percent - 0.01, 1.0, 100.0);
            self.metrics.temperature_c = clamp(self.metrics.temperature_c + self.range(-1.0, 1.0), 37.0, 45.0);
            return vec![RuntimeEvent::MetricsUpdated(MetricsUpdateEvent { event_type: "metrics_updated", metrics: self.metrics.clone() })];
        }

        self.machine.uptime_seconds += 2;
        let heartbeat_at = now();
        let latency = self.range(18.0, 46.0).round() as u32;
        self.machine.last_heartbeat_at = Some(heartbeat_at.clone());
        self.metrics.heartbeat_latency_ms = latency;

        let mut events = vec![RuntimeEvent::Heartbeat(HeartbeatEvent {
            event_type: "heartbeat",
            at: heartbeat_at,
            latency_ms: latency,
            uptime_seconds: self.machine.uptime_seconds,
        })];

        if self.active_job.is_none()
            && self.settings.auto_accept_jobs
            && !matches!(self.machine.status, WorkerStatus::Busy)
            && (self.machine.uptime_seconds >= 4 || self.next_unit() > 0.68)
        {
            let job = self.create_job();
            self.machine.status = WorkerStatus::Busy;
            self.active_job = Some(job.clone());
            let log = self.push_log(LogLevel::Success, &format!("Scheduler assigned {}.", job.name));

            self.metrics.cpu_usage = clamp(job.cpu_usage + self.range(0.0, 8.0), 35.0, self.settings.cpu_limit);
            self.metrics.memory_usage = clamp(job.memory_usage + self.range(0.0, 5.0), 28.0, 72.0);
            self.metrics.temperature_c = clamp(self.metrics.temperature_c + 2.0, 39.0, 72.0);

            events.push(RuntimeEvent::StatusChanged(WorkerStatusChangedEvent {
                event_type: "worker_status_changed",
                status: WorkerStatus::Busy,
                last_heartbeat_at: self.machine.last_heartbeat_at.clone(),
                uptime_seconds: self.machine.uptime_seconds,
            }));
            events.push(RuntimeEvent::JobAssigned(JobAssignedEvent { event_type: "job_assigned", job: job.clone() }));
            events.push(RuntimeEvent::LogEmitted(ActivityLogEvent { event_type: "log_emitted", log, job_id: Some(job.id) }));
            events.push(RuntimeEvent::MetricsUpdated(MetricsUpdateEvent { event_type: "metrics_updated", metrics: self.metrics.clone() }));
            return events;
        }

        if self.active_job.is_none() {
            self.machine.status = WorkerStatus::Idle;
            self.metrics.cpu_usage = clamp(12.0 + self.range(0.0, 10.0), 8.0, 24.0);
            self.metrics.memory_usage = clamp(29.0 + self.range(0.0, 8.0), 24.0, 42.0);
            self.metrics.temperature_c = clamp(40.0 + self.range(0.0, 5.0), 38.0, 50.0);
            self.metrics.network_mbps = clamp(105.0 + self.range(0.0, 44.0), 60.0, 180.0);
            events.push(RuntimeEvent::StatusChanged(WorkerStatusChangedEvent {
                event_type: "worker_status_changed",
                status: WorkerStatus::Idle,
                last_heartbeat_at: self.machine.last_heartbeat_at.clone(),
                uptime_seconds: self.machine.uptime_seconds,
            }));
            events.push(RuntimeEvent::MetricsUpdated(MetricsUpdateEvent { event_type: "metrics_updated", metrics: self.metrics.clone() }));
            return events;
        }

        let mut completed_job = None;
        let mut progress_log = None;
        let progress_bump = self.range(7.0, 16.0);
        let earning_bump = self.range(0.22, 0.67);
        let cpu_usage = clamp(40.0 + self.range(0.0, self.settings.cpu_limit), 24.0, self.settings.cpu_limit);
        let memory_usage = clamp(36.0 + self.range(0.0, 22.0), 26.0, 70.0);
        let should_log = self.next_unit() > 0.45;
        let log_message = if should_log { Some(self.pick_log_message().to_string()) } else { None };

        if let Some(job) = &mut self.active_job {
            job.progress = clamp(job.progress + progress_bump, 0.0, 100.0);
            job.earnings = money(job.earnings + earning_bump);
            job.cpu_usage = cpu_usage;
            job.memory_usage = memory_usage;

            if let Some(message) = log_message {
                let log = log_with_random_id(&mut self.rng_seed, LogLevel::Info, &message);
                job.logs.insert(0, log.clone());
                job.logs.truncate(16);
                progress_log = Some((job.id.clone(), log));
            }

            if job.progress >= 100.0 {
                job.status = JobStatus::Completed;
                job.progress = 100.0;
                let done_log = log_with_random_id(&mut self.rng_seed, LogLevel::Success, "Job completed. Results delivered and payout credited.");
                job.logs.insert(0, done_log);
                job.logs.truncate(16);
                completed_job = Some(job.clone());
            }
        }

        self.metrics.cpu_usage = cpu_usage;
        self.metrics.memory_usage = memory_usage;
        self.metrics.battery_percent = clamp(self.metrics.battery_percent - 0.03, 1.0, 100.0);
        self.metrics.temperature_c = clamp(43.0 + cpu_usage / 5.0 + self.range(0.0, 3.0), 40.0, 78.0);
        self.metrics.network_mbps = clamp(90.0 + self.range(0.0, 80.0), 48.0, 220.0);

        if let Some((job_id, log)) = progress_log {
            events.push(RuntimeEvent::LogEmitted(ActivityLogEvent { event_type: "log_emitted", log, job_id: Some(job_id) }));
        }

        events.push(RuntimeEvent::MetricsUpdated(MetricsUpdateEvent { event_type: "metrics_updated", metrics: self.metrics.clone() }));

        if let Some(job) = completed_job {
            self.active_job = None;
            self.machine.status = WorkerStatus::Idle;
            self.recent_jobs.insert(0, job.clone());
            self.recent_jobs.truncate(8);
            self.earnings.lifetime = money(self.earnings.lifetime + job.earnings);
            self.earnings.pending = money(self.earnings.pending + job.earnings);
            self.earnings.today = money(self.earnings.today + job.earnings);
            self.earnings.completed_jobs += 1;
            if let Some(point) = self.earnings.history.last_mut() {
                point.amount = money(point.amount + job.earnings);
            }

            let log = self.push_log(LogLevel::Success, &format!("{} completed. Earned ${:.2}.", job.name, job.earnings));
            events.push(RuntimeEvent::JobCompleted(JobCompletedEvent {
                event_type: "job_completed",
                job,
                recent_jobs: self.recent_jobs.clone(),
            }));
            events.push(RuntimeEvent::EarningsUpdated(EarningsUpdateEvent { event_type: "earnings_updated", earnings: self.earnings.clone() }));
            events.push(RuntimeEvent::StatusChanged(WorkerStatusChangedEvent {
                event_type: "worker_status_changed",
                status: WorkerStatus::Idle,
                last_heartbeat_at: self.machine.last_heartbeat_at.clone(),
                uptime_seconds: self.machine.uptime_seconds,
            }));
            events.push(RuntimeEvent::LogEmitted(ActivityLogEvent { event_type: "log_emitted", log, job_id: None }));
        } else if let Some(job) = self.active_job.clone() {
            events.push(RuntimeEvent::JobProgress(JobProgressEvent { event_type: "job_progress", job }));
        }

        events
    }

    fn create_job(&mut self) -> Job {
        self.job_counter += 1;
        let names = [
            "Neural texture baking batch",
            "Monte Carlo pricing sweep",
            "Synthetic dataset generation",
            "CI compile acceleration shard",
            "Video thumbnail render pack",
        ];
        let job_types = [JobType::Render, JobType::Simulation, JobType::BatchInference, JobType::Compile, JobType::DataCleaning];
        let index = (self.next_unit() * names.len() as f64).floor() as usize;
        let type_index = (self.next_unit() * job_types.len() as f64).floor() as usize;
        let started_at = Utc::now();

        Job {
            id: format!("job-{}", self.job_counter),
            name: names[index.min(names.len() - 1)].to_string(),
            job_type: job_types[type_index.min(job_types.len() - 1)].clone(),
            status: JobStatus::Running,
            progress: 2.0,
            started_at: Some(started_at.to_rfc3339_opts(SecondsFormat::Millis, true)),
            estimated_completion_at: Some((started_at + ChronoDuration::seconds(55)).to_rfc3339_opts(SecondsFormat::Millis, true)),
            earnings: 0.08,
            cpu_usage: 48.0,
            memory_usage: 32.0,
            logs: vec![
                log_with_random_id(&mut self.rng_seed, LogLevel::Success, "Job accepted automatically. Preparing isolated runtime."),
                log_with_random_id(&mut self.rng_seed, LogLevel::Info, "Runtime attestation complete."),
            ],
        }
    }

    fn push_log(&mut self, level: LogLevel, message: &str) -> JobLog {
        let log = log_with_random_id(&mut self.rng_seed, level, message);
        self.worker_logs.insert(0, log.clone());
        self.worker_logs.truncate(40);
        log
    }

    fn pick_log_message(&mut self) -> &'static str {
        let messages = [
            "Verified sandbox profile and payout contract.",
            "Pulled encrypted workload bundle.",
            "Allocated local CPU budget inside user limit.",
            "Checkpoint uploaded to ComputeBNB relay.",
            "Progress heartbeat accepted by scheduler.",
            "Thermal headroom is healthy.",
            "Output chunk sealed and queued for delivery.",
        ];
        let index = (self.next_unit() * messages.len() as f64).floor() as usize;
        messages[index.min(messages.len() - 1)]
    }

    fn next_unit(&mut self) -> f64 {
        next_unit(&mut self.rng_seed)
    }

    fn range(&mut self, min: f64, max: f64) -> f64 {
        min + (max - min) * self.next_unit()
    }
}

#[derive(Clone, Serialize)]
struct WorkerStatusChangedEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    status: WorkerStatus,
    #[serde(rename = "lastHeartbeatAt")]
    last_heartbeat_at: Option<String>,
    #[serde(rename = "uptimeSeconds")]
    uptime_seconds: u64,
}

#[derive(Clone, Serialize)]
struct MachineDetectedEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    machine: Machine,
}

#[derive(Clone, Serialize)]
struct MachineRegisteredEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    machine: Machine,
    settings: WorkerSettings,
}

#[derive(Clone, Serialize)]
struct HeartbeatEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    at: String,
    #[serde(rename = "latencyMs")]
    latency_ms: u32,
    #[serde(rename = "uptimeSeconds")]
    uptime_seconds: u64,
}

#[derive(Clone, Serialize)]
struct JobAssignedEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    job: Job,
}

#[derive(Clone, Serialize)]
struct JobProgressEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    job: Job,
}

#[derive(Clone, Serialize)]
struct JobCompletedEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    job: Job,
    #[serde(rename = "recentJobs")]
    recent_jobs: Vec<Job>,
}

#[derive(Clone, Serialize)]
struct MetricsUpdateEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    metrics: ResourceMetrics,
}

#[derive(Clone, Serialize)]
struct EarningsUpdateEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    earnings: Earnings,
}

#[derive(Clone, Serialize)]
struct ActivityLogEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    log: JobLog,
    #[serde(rename = "jobId")]
    job_id: Option<String>,
}

#[derive(Clone, Serialize)]
struct SettingsUpdatedEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    settings: WorkerSettings,
}

#[derive(Clone, Serialize)]
struct SnapshotEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    snapshot: WorkerRuntimeSnapshot,
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
            RuntimeEvent::StatusChanged(payload) => emit_worker_event(app, STATUS_CHANGED_EVENT, payload),
            RuntimeEvent::Heartbeat(payload) => emit_worker_event(app, HEARTBEAT_EVENT, payload),
            RuntimeEvent::JobAssigned(payload) => emit_worker_event(app, JOB_ASSIGNED_EVENT, payload),
            RuntimeEvent::JobProgress(payload) => emit_worker_event(app, JOB_PROGRESS_EVENT, payload),
            RuntimeEvent::LogEmitted(payload) => emit_worker_event(app, LOG_EMITTED_EVENT, payload),
            RuntimeEvent::JobCompleted(payload) => emit_worker_event(app, JOB_COMPLETED_EVENT, payload),
            RuntimeEvent::MetricsUpdated(payload) => emit_worker_event(app, METRICS_UPDATED_EVENT, payload),
            RuntimeEvent::EarningsUpdated(payload) => emit_worker_event(app, EARNINGS_UPDATED_EVENT, payload),
            RuntimeEvent::SettingsUpdated(payload) => emit_worker_event(app, SETTINGS_UPDATED_EVENT, payload),
        }
    }
}

fn emit_worker_event<T: Serialize + Clone>(app: &AppHandle, event_name: &str, payload: T) {
    let _ = app.emit(event_name, payload);
}

#[tauri::command]
pub fn detect_machine(app: AppHandle, manager: tauri::State<'_, WorkerManager>) -> Machine {
    let machine = {
        let mut runtime = manager.runtime.lock().expect("worker runtime poisoned");
        runtime.machine.name = local_machine_name();
        runtime.machine.os = local_os_name();
        runtime.machine.clone()
    };
    emit_worker_event(&app, MACHINE_DETECTED_EVENT, MachineDetectedEvent { event_type: "machine_detected", machine: machine.clone() });
    manager.emit_snapshot(&app);
    machine
}

#[tauri::command]
pub fn register_machine(app: AppHandle, manager: tauri::State<'_, WorkerManager>, settings: WorkerSettings) -> WorkerRuntimeSnapshot {
    {
        let mut runtime = manager.runtime.lock().expect("worker runtime poisoned");
        runtime.registered = true;
        runtime.update_settings(settings);
        runtime.machine.id = "native-node-preview".to_string();
        let log = runtime.push_log(LogLevel::Success, "Machine registered and trust policy saved.");
        emit_worker_event(&app, LOG_EMITTED_EVENT, ActivityLogEvent { event_type: "log_emitted", log, job_id: None });
        emit_worker_event(
            &app,
            MACHINE_REGISTERED_EVENT,
            MachineRegisteredEvent { event_type: "machine_registered", machine: runtime.machine.clone(), settings: runtime.settings.clone() },
        );
    }
    manager.emit_snapshot(&app);
    manager.snapshot()
}

#[tauri::command]
pub fn start_worker(app: AppHandle, manager: tauri::State<'_, WorkerManager>) -> WorkerRuntimeSnapshot {
    let events = {
        let mut runtime = manager.runtime.lock().expect("worker runtime poisoned");
        let mut events = runtime.set_status(WorkerStatus::Idle);
        let log = runtime.push_log(LogLevel::Success, "Worker started. Establishing scheduler session.");
        events.push(RuntimeEvent::LogEmitted(ActivityLogEvent { event_type: "log_emitted", log, job_id: None }));
        events
    };
    emit_events(&app, events);
    manager.ensure_runner(app.clone());
    manager.emit_snapshot(&app);
    manager.snapshot()
}

#[tauri::command]
pub fn stop_worker(app: AppHandle, manager: tauri::State<'_, WorkerManager>) -> WorkerRuntimeSnapshot {
    manager.stop_runner();
    let events = {
        let mut runtime = manager.runtime.lock().expect("worker runtime poisoned");
        if let Some(job) = &mut runtime.active_job {
            job.status = JobStatus::Paused;
        }
        runtime.machine.uptime_seconds = 0;
        runtime.metrics.cpu_usage = 5.0;
        runtime.metrics.memory_usage = 25.0;
        runtime.metrics.heartbeat_latency_ms = 0;
        let mut events = runtime.set_status(WorkerStatus::Offline);
        let log = runtime.push_log(LogLevel::Warning, "Worker stopped by owner.");
        events.push(RuntimeEvent::MetricsUpdated(MetricsUpdateEvent { event_type: "metrics_updated", metrics: runtime.metrics.clone() }));
        events.push(RuntimeEvent::LogEmitted(ActivityLogEvent { event_type: "log_emitted", log, job_id: None }));
        events
    };
    emit_events(&app, events);
    manager.emit_snapshot(&app);
    manager.snapshot()
}

#[tauri::command]
pub fn pause_worker(app: AppHandle, manager: tauri::State<'_, WorkerManager>) -> WorkerRuntimeSnapshot {
    let events = {
        let mut runtime = manager.runtime.lock().expect("worker runtime poisoned");
        if let Some(job) = &mut runtime.active_job {
            job.status = JobStatus::Paused;
        }
        let mut events = runtime.set_status(WorkerStatus::Paused);
        let log = runtime.push_log(LogLevel::Warning, "Worker paused. No new jobs will be accepted.");
        events.push(RuntimeEvent::LogEmitted(ActivityLogEvent { event_type: "log_emitted", log, job_id: None }));
        events
    };
    emit_events(&app, events);
    manager.emit_snapshot(&app);
    manager.snapshot()
}

#[tauri::command]
pub fn resume_worker(app: AppHandle, manager: tauri::State<'_, WorkerManager>) -> WorkerRuntimeSnapshot {
    let events = {
        let mut runtime = manager.runtime.lock().expect("worker runtime poisoned");
        if let Some(job) = &mut runtime.active_job {
            job.status = JobStatus::Running;
        }
        let status = if runtime.active_job.is_some() { WorkerStatus::Busy } else { WorkerStatus::Idle };
        let mut events = runtime.set_status(status);
        let log = runtime.push_log(LogLevel::Success, "Worker resumed.");
        events.push(RuntimeEvent::LogEmitted(ActivityLogEvent { event_type: "log_emitted", log, job_id: None }));
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
pub fn update_worker_settings(app: AppHandle, manager: tauri::State<'_, WorkerManager>, settings: WorkerSettings) -> WorkerRuntimeSnapshot {
    let events = {
        let mut runtime = manager.runtime.lock().expect("worker runtime poisoned");
        runtime.update_settings(settings)
    };
    emit_events(&app, events);
    manager.emit_snapshot(&app);
    manager.snapshot()
}

#[tauri::command]
pub fn emergency_stop(app: AppHandle, manager: tauri::State<'_, WorkerManager>) -> WorkerRuntimeSnapshot {
    manager.stop_runner();
    let events = {
        let mut runtime = manager.runtime.lock().expect("worker runtime poisoned");
        runtime.active_job = None;
        runtime.machine.uptime_seconds = 0;
        runtime.metrics.cpu_usage = 3.0;
        runtime.metrics.memory_usage = 22.0;
        runtime.metrics.heartbeat_latency_ms = 0;
        let mut events = runtime.set_status(WorkerStatus::Offline);
        let log = runtime.push_log(LogLevel::Error, "Emergency disconnect complete. Credentials remain local.");
        events.push(RuntimeEvent::MetricsUpdated(MetricsUpdateEvent { event_type: "metrics_updated", metrics: runtime.metrics.clone() }));
        events.push(RuntimeEvent::LogEmitted(ActivityLogEvent { event_type: "log_emitted", log, job_id: None }));
        events
    };
    emit_events(&app, events);
    manager.emit_snapshot(&app);
    manager.snapshot()
}

fn seed_recent_jobs() -> Vec<Job> {
    vec![
        completed_job("job-9812", "Protein fold sampling shard", JobType::Simulation, 8.72, 94, 63),
        completed_job("job-9721", "Product image render batch", JobType::Render, 6.25, 186, 151),
        completed_job("job-9655", "Search index compile sweep", JobType::Compile, 4.18, 390, 365),
    ]
}

fn completed_job(id: &str, name: &str, job_type: JobType, earnings: f64, started_minutes_ago: i64, completed_minutes_ago: i64) -> Job {
    Job {
        id: id.to_string(),
        name: name.to_string(),
        job_type,
        status: JobStatus::Completed,
        progress: 100.0,
        started_at: Some((Utc::now() - ChronoDuration::minutes(started_minutes_ago)).to_rfc3339_opts(SecondsFormat::Millis, true)),
        estimated_completion_at: Some((Utc::now() - ChronoDuration::minutes(completed_minutes_ago)).to_rfc3339_opts(SecondsFormat::Millis, true)),
        earnings,
        cpu_usage: 55.0,
        memory_usage: 39.0,
        logs: vec![],
    }
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
    JobLog { id: id.to_string(), at: now(), level, message: message.to_string() }
}

fn log_with_random_id(seed: &mut u64, level: LogLevel, message: &str) -> JobLog {
    let suffix = (next_unit(seed) * 1_000_000.0).round() as u64;
    log(&format!("log-{}-{}", Utc::now().timestamp_millis(), suffix), level, message)
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

/**
 * Populate the gpubnb database with simplified MVP demo data.
 * Run with: npx tsx --env-file=.env scripts/seed.ts
 */
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not set");
  process.exit(1);
}

function successRate(completedJobs: number, failedJobs: number) {
  const total = completedJobs + failedJobs;
  if (total === 0) return 100;
  return Number(((completedJobs / total) * 100).toFixed(1));
}

async function seed() {
  await mongoose.connect(MONGODB_URI!, {
    dbName: process.env.MONGODB_DB_NAME ?? "gpubnb",
  });

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Mongo connection missing database handle");
  }

  await db.dropDatabase();

  const now = Date.now();
  const machines = await db.collection("machines").insertMany([
    {
      name: "MacBook Pro M2",
      status: "online",
      capabilities: ["python", "cpu", "local-shell"],
      hourlyRateCents: 300,
      totalEarnedCents: 760,
      completedJobs: 2,
      failedJobs: 0,
      successRate: successRate(2, 0),
      trustScore: 98,
      lastHeartbeatAt: new Date(now - 5_000),
      createdAt: new Date(now - 3 * 86_400_000),
      updatedAt: new Date(now - 5_000),
    },
    {
      name: "Dell XPS Desktop",
      status: "busy",
      capabilities: ["python", "cpu", "batch"],
      hourlyRateCents: 450,
      totalEarnedCents: 960,
      completedJobs: 2,
      failedJobs: 1,
      successRate: successRate(2, 1),
      trustScore: 84,
      lastHeartbeatAt: new Date(now - 8_000),
      createdAt: new Date(now - 2 * 86_400_000),
      updatedAt: new Date(now - 8_000),
    },
    {
      name: "Raspberry Pi Cluster",
      status: "offline",
      capabilities: ["python", "cpu"],
      hourlyRateCents: 120,
      totalEarnedCents: 180,
      completedJobs: 1,
      failedJobs: 1,
      successRate: successRate(1, 1),
      trustScore: 67,
      lastHeartbeatAt: new Date(now - 240_000),
      createdAt: new Date(now - 5 * 86_400_000),
      updatedAt: new Date(now - 240_000),
    },
  ]);

  const machineIds = Object.values(machines.insertedIds);

  const jobDocs = [
    {
      title: "Summarize launch notes",
      type: "python",
      status: "completed",
      machineId: machineIds[0],
      source: "notes = ['GPUbnb connects spare compute', 'workers poll by machine', 'jobs store stdout/stderr'];\nprint('\\n'.join(f'- {note}' for note in notes))",
      stdout:
        "- GPUbnb connects spare compute\n- workers poll by machine\n- jobs store stdout/stderr",
      stderr: "",
      exitCode: 0,
      budgetCents: 700,
      jobCostCents: 700,
      providerPayoutCents: 560,
      platformFeeCents: 140,
      startedAt: new Date(now - 12 * 60_000),
      completedAt: new Date(now - 10 * 60_000),
      actualRuntimeSeconds: 120,
      proofHash: "2c8f7b13f4d1a8a1",
      createdAt: new Date(now - 13 * 60_000),
      updatedAt: new Date(now - 10 * 60_000),
    },
    {
      title: "Normalize customer CSV",
      type: "python",
      status: "completed",
      machineId: machineIds[1],
      source: "print('normalized,42')",
      stdout: "normalized,42",
      stderr: "",
      exitCode: 0,
      budgetCents: 500,
      jobCostCents: 500,
      providerPayoutCents: 400,
      platformFeeCents: 100,
      startedAt: new Date(now - 35 * 60_000),
      completedAt: new Date(now - 33 * 60_000),
      actualRuntimeSeconds: 90,
      proofHash: "838d899ecf4b79d4",
      createdAt: new Date(now - 36 * 60_000),
      updatedAt: new Date(now - 33 * 60_000),
    },
    {
      title: "Generate FAQ embeddings",
      type: "python",
      status: "running",
      machineId: machineIds[1],
      source: "print('embedding chunk 1/4')",
      stdout: "embedding chunk 1/4",
      stderr: "",
      exitCode: null,
      budgetCents: 1200,
      startedAt: new Date(now - 4 * 60_000),
      createdAt: new Date(now - 6 * 60_000),
      updatedAt: new Date(now - 45_000),
    },
    {
      title: "Translate support docs",
      type: "python",
      status: "queued",
      machineId: machineIds[0],
      source: "print('translate docs to Spanish')",
      stdout: "",
      stderr: "",
      exitCode: null,
      budgetCents: 800,
      createdAt: new Date(now - 2 * 60_000),
      updatedAt: new Date(now - 2 * 60_000),
    },
    {
      title: "Analyze sentiment batch",
      type: "python",
      status: "failed",
      machineId: machineIds[2],
      source: "raise MemoryError('batch too large')",
      stdout: "processed 312 rows",
      stderr: "MemoryError: batch too large",
      exitCode: 1,
      budgetCents: 1500,
      startedAt: new Date(now - 68 * 60_000),
      completedAt: new Date(now - 63 * 60_000),
      actualRuntimeSeconds: 180,
      failureReason: "MemoryError: batch too large",
      error: "MemoryError: batch too large",
      createdAt: new Date(now - 70 * 60_000),
      updatedAt: new Date(now - 63 * 60_000),
    },
  ];

  const jobs = await db.collection("jobs").insertMany(jobDocs);
  const jobIds = Object.values(jobs.insertedIds);

  await db.collection("jobevents").insertMany([
    {
      jobId: jobIds[0],
      machineId: machineIds[0],
      type: "queued",
      message: "Job queued for MacBook Pro M2",
      createdAt: jobDocs[0].createdAt,
      updatedAt: jobDocs[0].createdAt,
    },
    {
      jobId: jobIds[0],
      machineId: machineIds[0],
      type: "started",
      message: "Machine started execution",
      createdAt: jobDocs[0].startedAt,
      updatedAt: jobDocs[0].startedAt,
    },
    {
      jobId: jobIds[0],
      machineId: machineIds[0],
      type: "completed",
      message: "Machine completed job",
      createdAt: jobDocs[0].completedAt,
      updatedAt: jobDocs[0].completedAt,
    },
    {
      jobId: jobIds[1],
      machineId: machineIds[1],
      type: "queued",
      message: "Job queued for Dell XPS Desktop",
      createdAt: jobDocs[1].createdAt,
      updatedAt: jobDocs[1].createdAt,
    },
    {
      jobId: jobIds[1],
      machineId: machineIds[1],
      type: "completed",
      message: "Machine completed job",
      createdAt: jobDocs[1].completedAt,
      updatedAt: jobDocs[1].completedAt,
    },
    {
      jobId: jobIds[2],
      machineId: machineIds[1],
      type: "queued",
      message: "Job queued for Dell XPS Desktop",
      createdAt: jobDocs[2].createdAt,
      updatedAt: jobDocs[2].createdAt,
    },
    {
      jobId: jobIds[2],
      machineId: machineIds[1],
      type: "progress",
      message: "Machine reported progress",
      createdAt: new Date(now - 60_000),
      updatedAt: new Date(now - 60_000),
    },
    {
      jobId: jobIds[3],
      machineId: machineIds[0],
      type: "queued",
      message: "Job queued for MacBook Pro M2",
      createdAt: jobDocs[3].createdAt,
      updatedAt: jobDocs[3].createdAt,
    },
    {
      jobId: jobIds[4],
      machineId: machineIds[2],
      type: "queued",
      message: "Job queued for Raspberry Pi Cluster",
      createdAt: jobDocs[4].createdAt,
      updatedAt: jobDocs[4].createdAt,
    },
    {
      jobId: jobIds[4],
      machineId: machineIds[2],
      type: "failed",
      message: "MemoryError: batch too large",
      createdAt: jobDocs[4].completedAt,
      updatedAt: jobDocs[4].completedAt,
    },
  ]);

  await db.collection("ledgerentries").insertMany([
    {
      jobId: jobIds[0],
      machineId: machineIds[0],
      type: "job_charge",
      amountCents: 700,
      status: "captured",
      createdAt: jobDocs[0].completedAt,
      updatedAt: jobDocs[0].completedAt,
    },
    {
      jobId: jobIds[0],
      machineId: machineIds[0],
      type: "provider_payout",
      amountCents: 560,
      status: "pending",
      createdAt: jobDocs[0].completedAt,
      updatedAt: jobDocs[0].completedAt,
    },
    {
      jobId: jobIds[0],
      machineId: machineIds[0],
      type: "platform_fee",
      amountCents: 140,
      status: "captured",
      createdAt: jobDocs[0].completedAt,
      updatedAt: jobDocs[0].completedAt,
    },
    {
      jobId: jobIds[1],
      machineId: machineIds[1],
      type: "job_charge",
      amountCents: 500,
      status: "captured",
      createdAt: jobDocs[1].completedAt,
      updatedAt: jobDocs[1].completedAt,
    },
    {
      jobId: jobIds[1],
      machineId: machineIds[1],
      type: "provider_payout",
      amountCents: 400,
      status: "pending",
      createdAt: jobDocs[1].completedAt,
      updatedAt: jobDocs[1].completedAt,
    },
    {
      jobId: jobIds[1],
      machineId: machineIds[1],
      type: "platform_fee",
      amountCents: 100,
      status: "captured",
      createdAt: jobDocs[1].completedAt,
      updatedAt: jobDocs[1].completedAt,
    },
  ]);

  await Promise.all([
    db.collection("machines").createIndex({ status: 1, lastHeartbeatAt: -1 }),
    db.collection("machines").createIndex({ createdAt: -1 }),
    db.collection("machines").createIndex({ walletAddress: 1 }, { sparse: true }),
    db.collection("consumers").createIndex({ email: 1 }, { sparse: true }),
    db.collection("consumers").createIndex({ walletAddress: 1 }, { unique: true }),
    db.collection("consumers").createIndex({ createdAt: -1 }),
    db.collection("jobs").createIndex({ machineId: 1, status: 1, createdAt: 1 }),
    db.collection("jobs").createIndex({ consumerId: 1, createdAt: -1 }),
    db.collection("jobs").createIndex({ status: 1, createdAt: -1 }),
    db.collection("jobs").createIndex({ createdAt: -1 }),
    db.collection("jobevents").createIndex({ jobId: 1, createdAt: -1 }),
    db.collection("jobevents").createIndex({ machineId: 1, createdAt: -1 }),
    db.collection("jobevents").createIndex({ createdAt: -1 }),
    db.collection("ledgerentries").createIndex({ jobId: 1, type: 1 }, { unique: true }),
    db.collection("ledgerentries").createIndex({ machineId: 1, createdAt: -1 }),
    db.collection("ledgerentries").createIndex({ consumerId: 1, createdAt: -1 }),
  ]);

  console.log(`Seeded ${machineIds.length} machines`);
  console.log(`Seeded ${jobIds.length} jobs`);
  console.log("Seeded job events, ledger entries, and indexes after full DB reset");

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error("Seed failed:", error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});

/**
 * scripts/seed.ts
 *
 * Populate the gpubnb database with realistic demo data.
 * Run with: npx tsx --env-file=.env scripts/seed.ts
 */
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not set");
  process.exit(1);
}

async function seed() {
  await mongoose.connect(MONGODB_URI!, {
    dbName: process.env.MONGODB_DB_NAME ?? "gpubnb",
  });
  console.log("✅ Connected to MongoDB");

  const db = mongoose.connection.db!;

  // Clear existing data
  await Promise.all([
    db.collection("providers").deleteMany({}),
    db.collection("jobs").deleteMany({}),
    db.collection("assignments").deleteMany({}),
    db.collection("jobevents").deleteMany({}),
  ]);
  console.log("🗑️  Cleared existing data");

  // --- Providers ---
  const providers = await db.collection("providers").insertMany([
    {
      name: "MacBook Pro M2",
      status: "online",
      capabilities: ["cpu", "node", "lightweight-ai"],
      hourlyRateCents: 300,
      totalEarnedCents: 2240,
      completedJobs: 4,
      failedJobs: 0,
      successRate: 100,
      trustScore: 98,
      lastHeartbeatAt: new Date(),
      createdAt: new Date(Date.now() - 86400000 * 3),
      updatedAt: new Date(),
    },
    {
      name: "Dell XPS Desktop",
      status: "online",
      capabilities: ["cpu", "node", "gpu-lite"],
      hourlyRateCents: 450,
      totalEarnedCents: 1600,
      completedJobs: 3,
      failedJobs: 1,
      successRate: 75,
      trustScore: 82,
      lastHeartbeatAt: new Date(),
      createdAt: new Date(Date.now() - 86400000 * 2),
      updatedAt: new Date(),
    },
    {
      name: "Raspberry Pi Cluster",
      status: "offline",
      capabilities: ["cpu", "node"],
      hourlyRateCents: 100,
      totalEarnedCents: 400,
      completedJobs: 1,
      failedJobs: 1,
      successRate: 50,
      trustScore: 65,
      lastHeartbeatAt: new Date(Date.now() - 120000), // stale
      createdAt: new Date(Date.now() - 86400000 * 5),
      updatedAt: new Date(Date.now() - 120000),
    },
  ]);
  const providerIds = Object.values(providers.insertedIds);
  console.log(`✅ Seeded ${providerIds.length} providers`);

  // --- Jobs ---
  const now = Date.now();
  const jobDocs = [
    {
      title: "Summarize launch notes",
      type: "text_generation",
      status: "completed",
      input: "Summarize these hackathon launch notes into three bullets.",
      result: "1. GPUbnb connects spare compute with AI workloads.\n2. Workers run a lightweight CLI agent.\n3. Pricing uses an 80/20 split model.",
      budgetCents: 700,
      providerPayoutCents: 560,
      platformFeeCents: 140,
      assignedProviderId: providerIds[0],
      retryCount: 0,
      startedAt: new Date(now - 60000 * 10),
      completedAt: new Date(now - 60000 * 8),
      actualRuntimeSeconds: 120,
      proofHash: "sha256:abc123def456",
      createdAt: new Date(now - 60000 * 12),
      updatedAt: new Date(now - 60000 * 8),
    },
    {
      title: "Caption product image",
      type: "image_caption",
      status: "completed",
      input: "Generate a descriptive caption for this product image.",
      result: "A sleek matte-black wireless mouse sitting on a wooden desk.",
      budgetCents: 500,
      providerPayoutCents: 400,
      platformFeeCents: 100,
      assignedProviderId: providerIds[1],
      retryCount: 0,
      startedAt: new Date(now - 60000 * 30),
      completedAt: new Date(now - 60000 * 28),
      actualRuntimeSeconds: 90,
      proofHash: "sha256:789ghi012jkl",
      createdAt: new Date(now - 60000 * 35),
      updatedAt: new Date(now - 60000 * 28),
    },
    {
      title: "Generate embeddings for FAQ",
      type: "embedding",
      status: "running",
      input: "Embed our top 20 FAQ entries for semantic search.",
      budgetCents: 1200,
      assignedProviderId: providerIds[0],
      retryCount: 0,
      startedAt: new Date(now - 60000 * 2),
      createdAt: new Date(now - 60000 * 5),
      updatedAt: new Date(now - 60000),
    },
    {
      title: "Translate support docs",
      type: "text_generation",
      status: "queued",
      input: "Translate these support docs into Spanish.",
      budgetCents: 800,
      retryCount: 0,
      createdAt: new Date(now - 60000),
      updatedAt: new Date(now - 60000),
    },
    {
      title: "Analyze sentiment batch",
      type: "text_generation",
      status: "failed",
      input: "Run sentiment analysis on 500 product reviews.",
      budgetCents: 1500,
      assignedProviderId: providerIds[2],
      retryCount: 2,
      startedAt: new Date(now - 60000 * 60),
      completedAt: new Date(now - 60000 * 55),
      failureReason: "Worker ran out of memory after processing 312 reviews",
      error: "OOM: exceeded 512MB limit",
      createdAt: new Date(now - 60000 * 65),
      updatedAt: new Date(now - 60000 * 55),
    },
  ];

  const jobs = await db.collection("jobs").insertMany(jobDocs);
  const jobIds = Object.values(jobs.insertedIds);
  console.log(`✅ Seeded ${jobIds.length} jobs`);

  // --- Assignments ---
  await db.collection("assignments").insertMany([
    {
      jobId: jobIds[0],
      providerId: providerIds[0],
      status: "completed",
      startedAt: jobDocs[0].startedAt,
      completedAt: jobDocs[0].completedAt,
      createdAt: jobDocs[0].createdAt,
      updatedAt: jobDocs[0].completedAt,
    },
    {
      jobId: jobIds[1],
      providerId: providerIds[1],
      status: "completed",
      startedAt: jobDocs[1].startedAt,
      completedAt: jobDocs[1].completedAt,
      createdAt: jobDocs[1].createdAt,
      updatedAt: jobDocs[1].completedAt,
    },
    {
      jobId: jobIds[2],
      providerId: providerIds[0],
      status: "running",
      startedAt: jobDocs[2].startedAt,
      createdAt: jobDocs[2].createdAt,
      updatedAt: jobDocs[2].updatedAt,
    },
    {
      jobId: jobIds[4],
      providerId: providerIds[2],
      status: "failed",
      startedAt: jobDocs[4].startedAt,
      completedAt: jobDocs[4].completedAt,
      createdAt: jobDocs[4].createdAt,
      updatedAt: jobDocs[4].completedAt,
    },
  ]);
  console.log("✅ Seeded 4 assignments");

  // --- Job Events ---
  await db.collection("jobevents").insertMany([
    // Job 0 lifecycle
    { jobId: jobIds[0], type: "created", message: "Job queued from web app", createdAt: jobDocs[0].createdAt },
    { jobId: jobIds[0], providerId: providerIds[0], type: "assigned", message: "Assigned to MacBook Pro M2", createdAt: new Date(jobDocs[0].createdAt!.getTime() + 5000) },
    { jobId: jobIds[0], providerId: providerIds[0], type: "started", message: "Worker started execution", createdAt: jobDocs[0].startedAt },
    { jobId: jobIds[0], providerId: providerIds[0], type: "progress", message: "Processing 50%", progressPct: 50, createdAt: new Date(jobDocs[0].startedAt!.getTime() + 60000) },
    { jobId: jobIds[0], providerId: providerIds[0], type: "completed", message: "Worker completed job", createdAt: jobDocs[0].completedAt },
    // Job 1 lifecycle
    { jobId: jobIds[1], type: "created", message: "Job queued from web app", createdAt: jobDocs[1].createdAt },
    { jobId: jobIds[1], providerId: providerIds[1], type: "assigned", message: "Assigned to Dell XPS Desktop", createdAt: new Date(jobDocs[1].createdAt!.getTime() + 3000) },
    { jobId: jobIds[1], providerId: providerIds[1], type: "started", message: "Worker started execution", createdAt: jobDocs[1].startedAt },
    { jobId: jobIds[1], providerId: providerIds[1], type: "completed", message: "Worker completed job", createdAt: jobDocs[1].completedAt },
    // Job 2 (running)
    { jobId: jobIds[2], type: "created", message: "Job queued from web app", createdAt: jobDocs[2].createdAt },
    { jobId: jobIds[2], providerId: providerIds[0], type: "assigned", message: "Assigned to MacBook Pro M2", createdAt: new Date(jobDocs[2].createdAt!.getTime() + 2000) },
    { jobId: jobIds[2], providerId: providerIds[0], type: "started", message: "Worker started execution", createdAt: jobDocs[2].startedAt },
    { jobId: jobIds[2], providerId: providerIds[0], type: "progress", message: "Processing embeddings 25%", progressPct: 25, createdAt: new Date(now - 60000) },
    // Job 3 (queued)
    { jobId: jobIds[3], type: "created", message: "Job queued from web app", createdAt: jobDocs[3].createdAt },
    // Job 4 (failed)
    { jobId: jobIds[4], type: "created", message: "Job queued from web app", createdAt: jobDocs[4].createdAt },
    { jobId: jobIds[4], providerId: providerIds[2], type: "assigned", message: "Assigned to Raspberry Pi Cluster", createdAt: new Date(jobDocs[4].createdAt!.getTime() + 4000) },
    { jobId: jobIds[4], providerId: providerIds[2], type: "started", message: "Worker started execution", createdAt: jobDocs[4].startedAt },
    { jobId: jobIds[4], providerId: providerIds[2], type: "failed", message: "Worker ran out of memory", createdAt: jobDocs[4].completedAt },
  ]);
  console.log("✅ Seeded 18 job events");

  console.log("\n🎉 Seed complete!");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

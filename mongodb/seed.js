// Run in mongosh after selecting the GPUbnb database:
// use gpubnb
// load("mongodb/seed.js")

const now = new Date();

const providerResult = db.providers.insertOne({
  name: "Sample M2 Laptop",
  status: "online",
  capabilities: ["cpu", "node", "lightweight-ai"],
  hourlyRateCents: 300,
  totalEarnedCents: 0,
  lastHeartbeatAt: now,
  createdAt: now
});

const jobResult = db.jobs.insertOne({
  title: "Summarize launch notes",
  type: "text_generation",
  status: "queued",
  input: "Summarize these hackathon launch notes into three bullets.",
  budgetCents: 700,
  createdAt: now,
  updatedAt: now
});

db.job_events.insertOne({
  jobId: jobResult.insertedId,
  providerId: providerResult.insertedId,
  type: "created",
  message: "Seed job created",
  createdAt: now
});

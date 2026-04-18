// Run in mongosh after selecting the GPUbnb database:
// use gpubnb
// load("mongodb/indexes.js")

db.providers.createIndex({ status: 1 });
db.providers.createIndex({ lastHeartbeatAt: -1 });
db.jobs.createIndex({ status: 1, createdAt: 1 });
db.assignments.createIndex({ jobId: 1 }, { unique: true });
db.assignments.createIndex({ providerId: 1, status: 1 });
db.job_events.createIndex({ jobId: 1, createdAt: -1 });

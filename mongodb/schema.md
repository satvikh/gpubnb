# MongoDB Atlas Collections

GPUbnb uses MongoDB Atlas as the MVP persistence layer. The app can boot locally with `lib/mock-store.ts`; these collection shapes document the Atlas-backed implementation target.

## `providers`

```ts
{
  _id: ObjectId,
  name: string,
  status: "online" | "offline" | "busy",
  capabilities: string[],
  hourlyRateCents: number,
  totalEarnedCents: number,
  tokenHash?: string,
  lastHeartbeatAt?: Date,
  createdAt: Date
}
```

## `jobs`

```ts
{
  _id: ObjectId,
  title: string,
  type: "text_generation" | "image_caption" | "embedding" | "shell_demo",
  status: "queued" | "assigned" | "running" | "completed" | "failed",
  input: string,
  result?: string,
  error?: string,
  budgetCents: number,
  providerPayoutCents?: number,
  platformFeeCents?: number,
  createdAt: Date,
  updatedAt: Date
}
```

## `assignments`

```ts
{
  _id: ObjectId,
  jobId: ObjectId,
  providerId: ObjectId,
  status: "assigned" | "running" | "completed" | "failed",
  startedAt?: Date,
  completedAt?: Date,
  createdAt: Date
}
```

## `job_events`

```ts
{
  _id: ObjectId,
  jobId: ObjectId,
  providerId?: ObjectId,
  type: "created" | "assigned" | "started" | "progress" | "completed" | "failed",
  message: string,
  createdAt: Date
}
```

## Notes

- Store internal IDs as `ObjectId` in Atlas and convert to strings at API boundaries.
- Use a unique index on `assignments.jobId` so one job cannot be assigned twice.
- Use atomic `findOneAndUpdate` calls for scheduling to avoid assigning the same queued job to multiple providers.
- TODO: Add TTL or offline detection logic for providers whose heartbeats go stale.

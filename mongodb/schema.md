# MongoDB Atlas Collections

GPUbnb's simplified MVP backend persists five core collections:

- `machines`: inventory plus mocked worker auth metadata
- `consumers`: consumer accounts with custodial Solana devnet wallets
- `jobs`: machine-pinned Python jobs and their execution outputs
- `jobevents`: append-only lifecycle trail
- `ledgerentries`: captured job charge, machine payout, and platform fee rows

The legacy `/api/providers/*` routes still exist as a compatibility layer for mocked auth, but they now read and write the `machines` collection.

## `machines`

```ts
{
  _id: ObjectId,
  name: string,
  status: "online" | "offline" | "busy",
  capabilities: string[],
  hourlyRateCents: number,
  totalEarnedCents: number,
  completedJobs: number,
  failedJobs: number,
  successRate: number,
  tokenHash?: string,
  lastHeartbeatAt?: Date,
  trustScore: number,
  walletAddress?: string,
  walletSecretKey?: string,
  walletNetwork?: "devnet",
  createdAt: Date,
  updatedAt: Date
}
```

## `consumers`

```ts
{
  _id: ObjectId,
  name: string,
  email?: string,
  walletAddress: string,
  walletSecretKey: string,
  walletNetwork: "devnet",
  initialAirdropSignature?: string,
  totalSpentCents: number,
  createdAt: Date,
  updatedAt: Date
}
```

## `jobs`

```ts
{
  _id: ObjectId,
  title: string,
  type: "python" | string,
  status: "queued" | "running" | "completed" | "failed",
  machineId: ObjectId,
  consumerId?: ObjectId,
  source: string,
  stdout: string,
  stderr: string,
  exitCode?: number | null,
  budgetCents: number,
  jobCostCents?: number,
  providerPayoutCents?: number,
  platformFeeCents?: number,
  solanaPaymentLamports?: number,
  solanaPaymentSignature?: string,
  solanaPaymentStatus?: "pending" | "settled" | "failed",
  solanaCentsPerSol?: number,
  startedAt?: Date,
  completedAt?: Date,
  actualRuntimeSeconds?: number,
  proofHash?: string,
  failureReason?: string,
  error?: string,
  createdAt: Date,
  updatedAt: Date
}
```

## `jobevents`

```ts
{
  _id: ObjectId,
  jobId: ObjectId,
  machineId?: ObjectId,
  type: string,
  message: string,
  createdAt: Date,
  updatedAt: Date
}
```

## `ledgerentries`

```ts
{
  _id: ObjectId,
  jobId: ObjectId,
  machineId?: ObjectId,
  consumerId?: ObjectId,
  type: "job_charge" | "provider_payout" | "machine_payout" | "platform_fee" | "refund",
  amountCents: number,
  solanaLamports?: number,
  solanaSignature?: string,
  fromWalletAddress?: string,
  toWalletAddress?: string,
  solanaCentsPerSol?: number,
  status: "pending" | "captured" | "settled" | "voided",
  createdAt: Date,
  updatedAt: Date
}
```

## Notes

- Consumers are expected to choose a `machineId` when creating a job.
- New producer and consumer records generate Solana devnet wallets on the backend.
- Job completion transfers devnet SOL from the consumer wallet to the producer wallet at the fixed `COMPUTEBNB_SOLANA_CENTS_PER_SOL` conversion rate, defaulting to 5,000 cents per SOL. Decimal rates are supported up to six places and converted to lamports with integer rounding.
- Producers poll for work already assigned to their machine; there is no backend scheduler in this MVP.
- Lifecycle APIs mutate the job document directly rather than writing an `assignments` collection.
- Store internal IDs as `ObjectId` in Atlas and convert them to strings at API boundaries.

import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type JobStatus = "queued" | "running" | "completed" | "failed";
export type JobType = "python";

export interface IJob extends Document {
  title: string;
  type: string;
  status: JobStatus;
  machineId: Types.ObjectId;
  consumerId?: Types.ObjectId;
  source: string;
  stdout: string;
  stderr: string;
  exitCode?: number | null;
  budgetCents: number;
  jobCostCents?: number;
  providerPayoutCents?: number;
  platformFeeCents?: number;
  solanaPaymentLamports?: number;
  solanaPaymentSignature?: string;
  solanaPaymentStatus?: "pending" | "settled" | "failed";
  solanaCentsPerSol?: number;
  startedAt?: Date;
  completedAt?: Date;
  actualRuntimeSeconds?: number;
  proofHash?: string;
  failureReason?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, default: "python" },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      default: "queued",
    },
    machineId: { type: Schema.Types.ObjectId, ref: "Machine", required: true },
    consumerId: { type: Schema.Types.ObjectId, ref: "Consumer" },
    source: { type: String, required: true },
    stdout: { type: String, default: "" },
    stderr: { type: String, default: "" },
    exitCode: { type: Number, default: null },
    budgetCents: { type: Number, default: 500, min: 1 },
    jobCostCents: { type: Number, min: 0 },
    providerPayoutCents: { type: Number, min: 0 },
    platformFeeCents: { type: Number, min: 0 },
    solanaPaymentLamports: { type: Number, min: 0 },
    solanaPaymentSignature: { type: String },
    solanaPaymentStatus: {
      type: String,
      enum: ["pending", "settled", "failed"],
      default: "pending",
    },
    solanaCentsPerSol: { type: Number, min: 1 },
    startedAt: { type: Date },
    completedAt: { type: Date },
    actualRuntimeSeconds: { type: Number, min: 0 },
    proofHash: { type: String },
    failureReason: { type: String },
    error: { type: String },
  },
  { timestamps: true }
);

JobSchema.index({ machineId: 1, status: 1, createdAt: 1 });
JobSchema.index({ consumerId: 1, createdAt: -1 });
JobSchema.index({ status: 1, createdAt: -1 });
JobSchema.index({ createdAt: -1 });

const Job: Model<IJob> =
  mongoose.models.Job || mongoose.model<IJob>("Job", JobSchema);

export default Job;

import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type JobStatus = "queued" | "assigned" | "running" | "completed" | "failed";
export type JobType = "text_generation" | "image_caption" | "embedding" | "shell_demo";

export interface IJob extends Document {
  title: string;
  type: JobType;
  status: JobStatus;
  input: string;
  result?: string;
  error?: string;
  budgetCents: number;
  providerPayoutCents?: number;
  platformFeeCents?: number;
  assignedProviderId?: Types.ObjectId;
  retryCount: number;
  startedAt?: Date;
  completedAt?: Date;
  actualRuntimeSeconds?: number;
  proofHash?: string;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ["text_generation", "image_caption", "embedding", "shell_demo"],
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "assigned", "running", "completed", "failed"],
      default: "queued",
    },
    input: { type: String, required: true },
    result: { type: String },
    error: { type: String },
    budgetCents: { type: Number, default: 500 },
    providerPayoutCents: { type: Number },
    platformFeeCents: { type: Number },
    assignedProviderId: { type: Schema.Types.ObjectId, ref: "Provider" },
    retryCount: { type: Number, default: 0 },
    startedAt: { type: Date },
    completedAt: { type: Date },
    actualRuntimeSeconds: { type: Number },
    proofHash: { type: String },
    failureReason: { type: String },
  },
  { timestamps: true }
);

// Indexes
JobSchema.index({ status: 1 });
JobSchema.index({ createdAt: -1 });
JobSchema.index({ assignedProviderId: 1 });

const Job: Model<IJob> =
  mongoose.models.Job || mongoose.model<IJob>("Job", JobSchema);

export default Job;

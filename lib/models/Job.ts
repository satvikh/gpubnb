import mongoose, { Schema, Document, Model } from "mongoose";

export type JobStatus = "queued" | "assigned" | "running" | "completed" | "failed";
export type JobType = "text_generation" | "image_caption" | "embedding" | "shell_demo";

export interface IJob extends Document {
  title: string;
  type: JobType;
  status: JobStatus;
  input: string;
  requiredCapabilities: string[];
  runnerPayload?: Record<string, unknown>;
  result?: string;
  error?: string;
  budgetCents: number;
  providerPayoutCents?: number;
  platformFeeCents?: number;
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
    requiredCapabilities: { type: [String], default: ["cpu"] },
    runnerPayload: { type: Schema.Types.Mixed },
    result: { type: String },
    error: { type: String },
    budgetCents: { type: Number, default: 500 },
    providerPayoutCents: { type: Number },
    platformFeeCents: { type: Number },
  },
  { timestamps: true }
);

JobSchema.index({ status: 1, createdAt: 1 });

const Job: Model<IJob> =
  mongoose.models.Job || mongoose.model<IJob>("Job", JobSchema);

export default Job;

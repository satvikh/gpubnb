import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IJobEvent extends Document {
  jobId: Types.ObjectId;
  providerId?: Types.ObjectId;
  type: "created" | "assigned" | "started" | "progress" | "completed" | "failed";
  message: string;
  progressPct?: number;
  createdAt: Date;
  updatedAt: Date;
}

const JobEventSchema = new Schema<IJobEvent>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    providerId: { type: Schema.Types.ObjectId, ref: "Provider" },
    type: {
      type: String,
      enum: ["created", "assigned", "started", "progress", "completed", "failed"],
      required: true,
    },
    message: { type: String, required: true },
    progressPct: { type: Number, min: 0, max: 100 },
  },
  { timestamps: true }
);

// Indexes
JobEventSchema.index({ jobId: 1 });
JobEventSchema.index({ createdAt: -1 });

const JobEvent: Model<IJobEvent> =
  mongoose.models.JobEvent || mongoose.model<IJobEvent>("JobEvent", JobEventSchema);

export default JobEvent;

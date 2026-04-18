import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IJobEvent extends Document {
  jobId: Types.ObjectId;
  providerId?: Types.ObjectId;
  type: "created" | "assigned" | "started" | "progress" | "completed" | "failed";
  message: string;
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
  },
  { timestamps: true }
);

JobEventSchema.index({ jobId: 1 });

const JobEvent: Model<IJobEvent> =
  mongoose.models.JobEvent || mongoose.model<IJobEvent>("JobEvent", JobEventSchema);

export default JobEvent;

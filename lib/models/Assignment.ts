import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAssignment extends Document {
  jobId: Types.ObjectId;
  providerId: Types.ObjectId;
  status: "assigned" | "running" | "completed" | "failed";
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    providerId: { type: Schema.Types.ObjectId, ref: "Provider", required: true },
    status: {
      type: String,
      enum: ["assigned", "running", "completed", "failed"],
      default: "assigned",
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes
AssignmentSchema.index({ jobId: 1 }, { unique: true });
AssignmentSchema.index({ providerId: 1 });
AssignmentSchema.index({ status: 1 });

const Assignment: Model<IAssignment> =
  mongoose.models.Assignment ||
  mongoose.model<IAssignment>("Assignment", AssignmentSchema);

export default Assignment;

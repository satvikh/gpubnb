import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProvider extends Document {
  name: string;
  status: "online" | "offline" | "busy";
  capabilities: string[];
  hourlyRateCents: number;
  totalEarnedCents: number;
  completedJobs: number;
  failedJobs: number;
  successRate: number;
  tokenHash?: string;
  lastHeartbeatAt?: Date;
  completedJobs: number;
  failedJobs: number;
  successRate: number;
  trustScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProviderSchema = new Schema<IProvider>(
  {
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ["online", "offline", "busy"],
      default: "online",
    },
    capabilities: { type: [String], default: ["cpu", "node"] },
    hourlyRateCents: { type: Number, default: 250 },
    totalEarnedCents: { type: Number, default: 0 },
    completedJobs: { type: Number, default: 0 },
    failedJobs: { type: Number, default: 0 },
    successRate: { type: Number, default: 100 },
    tokenHash: { type: String },
    lastHeartbeatAt: { type: Date },
    completedJobs: { type: Number, default: 0 },
    failedJobs: { type: Number, default: 0 },
    successRate: { type: Number, default: 100 },
    trustScore: { type: Number, default: 100 },
  },
  { timestamps: true }
);

// Indexes
ProviderSchema.index({ status: 1 });
ProviderSchema.index({ lastHeartbeatAt: 1 });

// Prevent model recompilation in Next.js hot reload
const Provider: Model<IProvider> =
  mongoose.models.Provider || mongoose.model<IProvider>("Provider", ProviderSchema);

export default Provider;

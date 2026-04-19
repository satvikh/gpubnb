import mongoose, { Document, Model, Schema } from "mongoose";

export type MachineStatus = "online" | "offline" | "busy";

export interface IMachine extends Document {
  name: string;
  status: MachineStatus;
  capabilities: string[];
  hourlyRateCents: number;
  totalEarnedCents: number;
  completedJobs: number;
  failedJobs: number;
  successRate: number;
  tokenHash?: string;
  lastHeartbeatAt?: Date;
  trustScore: number;
  walletAddress?: string;
  walletSecretKey?: string;
  walletNetwork?: "devnet";
  createdAt: Date;
  updatedAt: Date;
}

const MachineSchema = new Schema<IMachine>(
  {
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["online", "offline", "busy"],
      default: "online",
    },
    capabilities: { type: [String], default: ["python", "cpu"] },
    hourlyRateCents: { type: Number, default: 250, min: 1 },
    totalEarnedCents: { type: Number, default: 0, min: 0 },
    completedJobs: { type: Number, default: 0, min: 0 },
    failedJobs: { type: Number, default: 0, min: 0 },
    successRate: { type: Number, default: 100, min: 0, max: 100 },
    tokenHash: { type: String },
    lastHeartbeatAt: { type: Date },
    trustScore: { type: Number, default: 100, min: 0, max: 100 },
    walletAddress: { type: String },
    walletSecretKey: { type: String },
    walletNetwork: { type: String, enum: ["devnet"] },
  },
  {
    timestamps: true,
    collection: "machines",
  }
);

MachineSchema.index({ status: 1, lastHeartbeatAt: -1 });
MachineSchema.index({ createdAt: -1 });
MachineSchema.index({ walletAddress: 1 }, { sparse: true });

const Machine: Model<IMachine> =
  mongoose.models.Machine || mongoose.model<IMachine>("Machine", MachineSchema);

export default Machine;

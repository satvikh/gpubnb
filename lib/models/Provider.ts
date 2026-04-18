import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProvider extends Document {
  name: string;
  status: "online" | "offline" | "busy";
  capabilities: string[];
  hourlyRateCents: number;
  totalEarnedCents: number;
  tokenHash?: string;
  lastHeartbeatAt?: Date;
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
    tokenHash: { type: String },
    lastHeartbeatAt: { type: Date },
  },
  { timestamps: true }
);

// Prevent model recompilation in Next.js hot reload
const Provider: Model<IProvider> =
  mongoose.models.Provider || mongoose.model<IProvider>("Provider", ProviderSchema);

export default Provider;

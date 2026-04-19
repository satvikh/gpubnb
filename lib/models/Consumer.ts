import mongoose, { Document, Model, Schema } from "mongoose";

export interface IConsumer extends Document {
  name: string;
  email?: string;
  walletAddress: string;
  walletSecretKey: string;
  walletNetwork: "devnet";
  initialAirdropSignature?: string;
  totalSpentCents: number;
  createdAt: Date;
  updatedAt: Date;
}

const ConsumerSchema = new Schema<IConsumer>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    walletAddress: { type: String, required: true, unique: true },
    walletSecretKey: { type: String, required: true },
    walletNetwork: { type: String, enum: ["devnet"], default: "devnet" },
    initialAirdropSignature: { type: String },
    totalSpentCents: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

ConsumerSchema.index({ email: 1 }, { sparse: true });
ConsumerSchema.index({ createdAt: -1 });

const Consumer: Model<IConsumer> =
  mongoose.models.Consumer || mongoose.model<IConsumer>("Consumer", ConsumerSchema);

export default Consumer;

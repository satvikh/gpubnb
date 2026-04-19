import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ILedgerEntry extends Document {
  jobId: Types.ObjectId;
  machineId?: Types.ObjectId;
  consumerId?: Types.ObjectId;
  type: "job_charge" | "provider_payout" | "machine_payout" | "platform_fee" | "refund";
  amountCents: number;
  solanaLamports?: number;
  solanaSignature?: string;
  fromWalletAddress?: string;
  toWalletAddress?: string;
  solanaCentsPerSol?: number;
  status: "pending" | "captured" | "settled" | "voided";
  createdAt: Date;
  updatedAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    machineId: { type: Schema.Types.ObjectId, ref: "Machine" },
    consumerId: { type: Schema.Types.ObjectId, ref: "Consumer" },
    type: {
      type: String,
      enum: ["job_charge", "provider_payout", "machine_payout", "platform_fee", "refund"],
      required: true,
    },
    amountCents: { type: Number, required: true, min: 0 },
    solanaLamports: { type: Number, min: 0 },
    solanaSignature: { type: String },
    fromWalletAddress: { type: String },
    toWalletAddress: { type: String },
    solanaCentsPerSol: { type: Number, min: 1 },
    status: {
      type: String,
      enum: ["pending", "captured", "settled", "voided"],
      required: true,
    },
  },
  { timestamps: true }
);

LedgerEntrySchema.index({ jobId: 1, type: 1 }, { unique: true });
LedgerEntrySchema.index({ machineId: 1, createdAt: -1 });
LedgerEntrySchema.index({ consumerId: 1, createdAt: -1 });

const LedgerEntry: Model<ILedgerEntry> =
  mongoose.models.LedgerEntry || mongoose.model<ILedgerEntry>("LedgerEntry", LedgerEntrySchema);

export default LedgerEntry;

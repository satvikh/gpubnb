import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ILedgerEntry extends Document {
  jobId: Types.ObjectId;
  providerId?: Types.ObjectId;
  type: "job_charge" | "provider_payout" | "platform_fee" | "refund";
  amountCents: number;
  status: "pending" | "captured" | "settled" | "voided";
  createdAt: Date;
  updatedAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    providerId: { type: Schema.Types.ObjectId, ref: "Provider" },
    type: {
      type: String,
      enum: ["job_charge", "provider_payout", "platform_fee", "refund"],
      required: true
    },
    amountCents: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "captured", "settled", "voided"],
      required: true
    }
  },
  { timestamps: true }
);

LedgerEntrySchema.index({ jobId: 1, type: 1 }, { unique: true });
LedgerEntrySchema.index({ providerId: 1, createdAt: -1 });

const LedgerEntry: Model<ILedgerEntry> =
  mongoose.models.LedgerEntry || mongoose.model<ILedgerEntry>("LedgerEntry", LedgerEntrySchema);

export default LedgerEntry;

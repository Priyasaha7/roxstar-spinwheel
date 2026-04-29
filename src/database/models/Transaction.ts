import { Schema, model } from "mongoose";
import Transaction, { TransactionType } from "../../types/Transaction";

export const DOCUMENT_NAME = "Transaction";
export const COLLECTION_NAME = "transactions";

const schema = new Schema<Transaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    spinWheelId: { type: Schema.Types.ObjectId, ref: "SpinWheel" },
    type: {
      type: Schema.Types.String,
      enum: Object.values(TransactionType),
      required: true,
    },
    amount: { type: Schema.Types.Number, required: true },
    balanceBefore: { type: Schema.Types.Number, required: true },
    balanceAfter: { type: Schema.Types.Number, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable ledger
    versionKey: false,
  },
);

schema.index({ userId: 1 });

export const TransactionModel = model<Transaction>(
  DOCUMENT_NAME,
  schema,
  COLLECTION_NAME,
);

import { Schema, model } from "mongoose";
import SpinWheel, { SpinWheelStatus } from "../../types/SpinWheel";

export const DOCUMENT_NAME = "SpinWheel";
export const COLLECTION_NAME = "spin_wheels";

const schema = new Schema<SpinWheel>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: Schema.Types.String,
      enum: Object.values(SpinWheelStatus),
      default: SpinWheelStatus.WAITING,
    },
    entryFee: { type: Schema.Types.Number, required: true },

    totalWinnerPool: { type: Schema.Types.Number, default: 0 },
    totalAdminPool: { type: Schema.Types.Number, default: 0 },
    totalAppPool: { type: Schema.Types.Number, default: 0 },

    participantsCount: { type: Schema.Types.Number, default: 0 },

    eliminationSequence: [{ type: Schema.Types.ObjectId, ref: "User" }],
    currentEliminationIndex: { type: Schema.Types.Number, default: 0 },

    winner: { type: Schema.Types.ObjectId, ref: "User" },

    autoStartAt: { type: Schema.Types.Date },
    startedAt: { type: Schema.Types.Date },
    endedAt: { type: Schema.Types.Date },
  },
  { timestamps: true, versionKey: false },
);

// Index to quickly find active wheels
schema.index({ status: 1 });

export const SpinWheelModel = model<SpinWheel>(
  DOCUMENT_NAME,
  schema,
  COLLECTION_NAME,
);

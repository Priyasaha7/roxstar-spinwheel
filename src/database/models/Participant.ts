import { Schema, model } from "mongoose";
import Participant from "../../types/Participant";

export const DOCUMENT_NAME = "Participant";
export const COLLECTION_NAME = "participants";

const schema = new Schema<Participant>(
  {
    spinWheelId: {
      type: Schema.Types.ObjectId,
      ref: "SpinWheel",
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    joinedAt: { type: Schema.Types.Date, default: Date.now },
    isEliminated: { type: Schema.Types.Boolean, default: false }, // <-- Added this
    eliminatedAt: { type: Schema.Types.Date },
    isWinner: { type: Schema.Types.Boolean, default: false },
  },
  { versionKey: false },
);

// Compound indexes for fast querying and preventing double-joins
schema.index({ spinWheelId: 1, userId: 1 }, { unique: true });
schema.index({ spinWheelId: 1, isEliminated: 1 });
schema.index({ userId: 1 });

export const ParticipantModel = model<Participant>(
  DOCUMENT_NAME,
  schema,
  COLLECTION_NAME,
);

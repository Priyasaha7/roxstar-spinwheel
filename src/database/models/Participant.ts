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
    eliminatedAt: { type: Schema.Types.Date },
    isWinner: { type: Schema.Types.Boolean, default: false },
  },
  { versionKey: false },
);

// CRITICAL: Prevents the same user from joining the same wheel twice
schema.index({ spinWheelId: 1, userId: 1 }, { unique: true });

export const ParticipantModel = model<Participant>(
  DOCUMENT_NAME,
  schema,
  COLLECTION_NAME,
);

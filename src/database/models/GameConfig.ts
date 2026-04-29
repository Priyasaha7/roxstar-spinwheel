import { Schema, model } from "mongoose";
import GameConfig from "../../types/GameConfig";

export const DOCUMENT_NAME = "GameConfig";
export const COLLECTION_NAME = "game_configs";

const schema = new Schema<GameConfig>(
  {
    version: { type: Schema.Types.Number, required: true, unique: true },
    winnerPercentage: {
      type: Schema.Types.Number,
      required: true,
      min: 0,
      max: 100,
    },
    adminPercentage: {
      type: Schema.Types.Number,
      required: true,
      min: 0,
      max: 100,
    },
    appPercentage: {
      type: Schema.Types.Number,
      required: true,
      min: 0,
      max: 100,
    },
    isActive: { type: Schema.Types.Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

// ── Validation: Ensure the split equals exactly 100% ─────────────────────────────
schema.pre("save", async function () {
  const total =
    this.winnerPercentage + this.adminPercentage + this.appPercentage;
  if (total !== 100) {
    throw new Error(`Percentages must equal 100. Got ${total}`);
  }
});

schema.index({ isActive: 1 });

export const GameConfigModel = model<GameConfig>(
  DOCUMENT_NAME,
  schema,
  COLLECTION_NAME,
);

import { Schema, model } from "mongoose";
import GameConfig from "../../types/GameConfig";

export const DOCUMENT_NAME = "GameConfig";
export const COLLECTION_NAME = "game_configs";

const schema = new Schema<GameConfig>(
  {
    version: { type: Schema.Types.Number, required: true, unique: true },
    winnerPercentage: { type: Schema.Types.Number, required: true },
    adminPercentage: { type: Schema.Types.Number, required: true },
    appPercentage: { type: Schema.Types.Number, required: true },
    isActive: { type: Schema.Types.Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

export const GameConfigModel = model<GameConfig>(
  DOCUMENT_NAME,
  schema,
  COLLECTION_NAME,
);

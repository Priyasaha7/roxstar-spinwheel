import { Schema, model } from "mongoose";
import Keystore from "../../types/Keystore";

export const DOCUMENT_NAME = "Keystore";
export const COLLECTION_NAME = "keystores";

const schema = new Schema<Keystore>(
  {
    client: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    primaryKey: { type: Schema.Types.String, required: true, trim: true },
    secondaryKey: { type: Schema.Types.String, required: true, trim: true },
    status: { type: Schema.Types.Boolean, default: true },
  },
  { versionKey: false, timestamps: true },
);

schema.index({ client: 1 });
schema.index({ client: 1, primaryKey: 1, status: 1 });
schema.index({ client: 1, primaryKey: 1, secondaryKey: 1 });
export const KeystoreModel = model<Keystore>(
  DOCUMENT_NAME,
  schema,
  COLLECTION_NAME,
);

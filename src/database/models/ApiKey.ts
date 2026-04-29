import { Schema, model } from "mongoose";
import { Permission } from "../../types/permissions";
import ApiKey from "../../types/ApiKey";

export const DOCUMENT_NAME = "ApiKey";
export const COLLECTION_NAME = "api_keys";

const schema = new Schema<ApiKey>(
  {
    key: {
      type: Schema.Types.String,
      required: true,
      unique: true,
      maxlength: 1024,
      trim: true,
    },
    version: { type: Schema.Types.Number, required: true, min: 1, max: 100 },
    permissions: [
      {
        type: Schema.Types.String,
        required: true,
        enum: Object.values(Permission),
      },
    ],
    comments: [
      {
        type: Schema.Types.String,
        required: true,
        trim: true,
        maxlength: 1000,
      },
    ],
    status: { type: Schema.Types.Boolean, default: true },
  },
  { versionKey: false, timestamps: true },
);

schema.index({ key: 1, status: 1 });
export const ApiKeyModel = model<ApiKey>(
  DOCUMENT_NAME,
  schema,
  COLLECTION_NAME,
);

import { Schema, model } from "mongoose";
import Role, { RoleCode } from "../../types/Role";

export const DOCUMENT_NAME = "Role";
export const COLLECTION_NAME = "roles";

const schema = new Schema<Role>(
  {
    code: {
      type: Schema.Types.String,
      required: true,
      enum: Object.values(RoleCode),
    },
    status: { type: Schema.Types.Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

schema.index({ code: 1, status: 1 });
export const RoleModel = model<Role>(DOCUMENT_NAME, schema, COLLECTION_NAME);

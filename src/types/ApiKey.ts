import { Types } from "mongoose";
import { Permission } from "./permissions";

export default interface ApiKey {
  _id: Types.ObjectId;
  key: string;
  version: number;
  permissions: Permission[];
  comments: string[];
  status?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

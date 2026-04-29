import { Types } from "mongoose";
import User from "./User";

export default interface Keystore {
  _id: Types.ObjectId;
  client: User | Types.ObjectId;
  primaryKey: string;
  secondaryKey: string;
  status?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

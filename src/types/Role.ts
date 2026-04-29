import { Types } from "mongoose";

export enum RoleCode {
  USER = "user",
  ADMIN = "admin",
}

export default interface Role {
  _id: Types.ObjectId;
  code: string;
  status?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

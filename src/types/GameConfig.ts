import { Types } from "mongoose";

export default interface GameConfig {
  _id: Types.ObjectId;
  version: number;
  winnerPercentage: number;
  adminPercentage: number;
  appPercentage: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

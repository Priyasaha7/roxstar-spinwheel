import { Types } from "mongoose";
import Role from "./Role";

export default interface User {
  _id: Types.ObjectId;
  name?: string;
  email: string;
  password: string;
  roles: Role[];
  coins: number; // Added for RoxStar: The user's wallet balance
  verified?: boolean;
  status?: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  isPasswordCorrect(password: string): Promise<boolean>;
}

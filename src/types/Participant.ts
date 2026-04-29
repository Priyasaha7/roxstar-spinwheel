import { Types } from "mongoose";

export default interface Participant {
  _id: Types.ObjectId;
  spinWheelId: Types.ObjectId;
  userId: Types.ObjectId;
  joinedAt: Date;
  isEliminated: boolean;
  eliminatedAt?: Date;
  isWinner: boolean;
}

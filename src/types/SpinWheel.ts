import { Types } from "mongoose";
import User from "./User";

export enum SpinWheelStatus {
  CREATED = "created",
  WAITING = "waiting", // Waiting for players (3 min timer starts)
  ACTIVE = "active", // Game started, eliminations running
  FINISHED = "finished",
  ABORTED = "aborted", // Aborted if < 3 players
}

export default interface SpinWheel {
  _id: Types.ObjectId;
  createdBy: User | Types.ObjectId;
  status: SpinWheelStatus;
  entryFee: number;

  // Tracking cumulative pools as required by the client
  totalWinnerPool: number;
  totalAdminPool: number;
  totalAppPool: number;

  participantsCount: number;

  // The pre-calculated order of who gets eliminated
  eliminationSequence: Types.ObjectId[];
  currentEliminationIndex: number;

  winner?: User | Types.ObjectId;

  autoStartAt?: Date; // Exactly 3 minutes after creation
  startedAt?: Date;
  endedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

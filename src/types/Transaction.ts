import { Types } from "mongoose";

export enum TransactionType {
  ENTRY_FEE = "entry_fee",
  WINNER_PAYOUT = "winner_payout",
  ADMIN_PAYOUT = "admin_payout",
  APP_CUT = "app_cut",
  REFUND = "refund",
}

export default interface Transaction {
  _id: Types.ObjectId;
  userId: Types.ObjectId; // Who is this transaction for
  spinWheelId?: Types.ObjectId; // Which game caused it
  type: TransactionType;
  amount: number; // Negative for deductions (paying entry fee), positive for additions (winning)
  balanceBefore: number;
  balanceAfter: number;
  createdAt?: Date;
}

import { Types } from "mongoose";

export enum TransactionType {
  ENTRY_FEE_DEBIT = "entry_fee_debit", // User paid to join
  WINNER_POOL_CREDIT = "winner_pool_credit", // % goes to winner pool
  ADMIN_POOL_CREDIT = "admin_pool_credit", // % goes to admin pool
  APP_POOL_CREDIT = "app_pool_credit", // % goes to app pool
  WINNER_PAYOUT = "winner_payout", // Winner receives pool
  ADMIN_PAYOUT = "admin_payout", // Admin receives cut
  REFUND = "refund", // Game aborted, coins returned
}

export default interface Transaction {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  spinWheelId?: Types.ObjectId;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt?: Date;
}

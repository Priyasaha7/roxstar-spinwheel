import { Types } from "mongoose";
import { TransactionModel } from "../models/Transaction";
import { TransactionType } from "../../types/Transaction";

async function create(
  userId: Types.ObjectId,
  spinWheelId: Types.ObjectId,
  type: TransactionType,
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
) {
  return TransactionModel.create({
    userId,
    spinWheelId,
    type,
    amount,
    balanceBefore,
    balanceAfter,
  });
}

export default { create };

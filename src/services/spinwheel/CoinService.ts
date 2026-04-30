import mongoose, { Types } from "mongoose";
import UserRepo from "../../database/repositories/UserRepo";
import TransactionRepo from "../../database/repositories/TransactionRepo";
import SpinWheelRepo from "../../database/repositories/SpinWheelRepo";
import GameConfigRepo from "../../database/repositories/GameConfigRepo";
import { TransactionType } from "../../types/Transaction";
import { InternalError, BadRequestError } from "../../core/ApiError";

export class CoinService {
  async processEntryFee(
    userId: Types.ObjectId,
    spinWheelId: Types.ObjectId,
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const spinWheel = await SpinWheelRepo.findById(spinWheelId);
      if (!spinWheel) throw new InternalError("Spin wheel not found");

      const config = await GameConfigRepo.getActive();
      if (!config)
        throw new InternalError("Game config not found. Run seed:roles first.");

      const user = await UserRepo.findById(userId);
      if (!user) throw new InternalError("User not found");

      const entryFee = spinWheel.entryFee;

      if (user.coins < entryFee)
        throw new BadRequestError("Insufficient coins to join.");

      // Fixed: Using our schema property names (winnerPercentage, etc.)
      const winnerShare = Math.floor(
        (entryFee * config.winnerPercentage) / 100,
      );
      const adminShare = Math.floor((entryFee * config.adminPercentage) / 100);
      const appShare = entryFee - winnerShare - adminShare;

      const balanceBefore = user.coins;
      const balanceAfter = balanceBefore - entryFee;

      await UserRepo.updateCoins(userId, balanceAfter);
      await SpinWheelRepo.addToPool(
        spinWheelId,
        winnerShare,
        adminShare,
        appShare,
      );

      await TransactionRepo.create(
        userId,
        spinWheelId,
        TransactionType.ENTRY_FEE_DEBIT,
        entryFee,
        balanceBefore,
        balanceAfter,
      );

      await TransactionRepo.create(
        userId,
        spinWheelId,
        TransactionType.WINNER_POOL_CREDIT,
        winnerShare,
        0,
        0,
      );
      await TransactionRepo.create(
        userId,
        spinWheelId,
        TransactionType.ADMIN_POOL_CREDIT,
        adminShare,
        0,
        0,
      );
      await TransactionRepo.create(
        userId,
        spinWheelId,
        TransactionType.APP_POOL_CREDIT,
        appShare,
        0,
        0,
      );

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  async processPayout(spinWheelId: Types.ObjectId): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const spinWheel = await SpinWheelRepo.findById(spinWheelId);
      // Fixed: Using spinWheel.winner instead of winnerId
      if (!spinWheel || !spinWheel.winner)
        throw new InternalError("No winner set");

      // Added TypeScript casts for strictly populated ObjectId fields
      const winner = await UserRepo.findById(
        spinWheel.winner as Types.ObjectId,
      );
      const admin = await UserRepo.findById(
        spinWheel.createdBy as Types.ObjectId,
      );

      if (!winner || !admin)
        throw new InternalError("Winner or admin not found");

      // Fixed: Using totalWinnerPool and totalAdminPool
      const winnerNewBalance = winner.coins + spinWheel.totalWinnerPool;
      await UserRepo.updateCoins(
        spinWheel.winner as Types.ObjectId,
        winnerNewBalance,
      );
      await TransactionRepo.create(
        spinWheel.winner as Types.ObjectId,
        spinWheelId,
        TransactionType.WINNER_PAYOUT,
        spinWheel.totalWinnerPool,
        winner.coins,
        winnerNewBalance,
      );

      const adminNewBalance = admin.coins + spinWheel.totalAdminPool;
      await UserRepo.updateCoins(
        spinWheel.createdBy as Types.ObjectId,
        adminNewBalance,
      );
      await TransactionRepo.create(
        spinWheel.createdBy as Types.ObjectId,
        spinWheelId,
        TransactionType.ADMIN_PAYOUT,
        spinWheel.totalAdminPool,
        admin.coins,
        adminNewBalance,
      );

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  async processRefunds(
    spinWheelId: Types.ObjectId,
    userIds: Types.ObjectId[],
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const spinWheel = await SpinWheelRepo.findById(spinWheelId);
      if (!spinWheel) throw new InternalError("Spin wheel not found");

      for (const userId of userIds) {
        const user = await UserRepo.findById(userId);
        if (!user) continue;

        const newBalance = user.coins + spinWheel.entryFee;
        await UserRepo.updateCoins(userId, newBalance);
        await TransactionRepo.create(
          userId,
          spinWheelId,
          TransactionType.REFUND,
          spinWheel.entryFee,
          user.coins,
          newBalance,
        );
      }

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}

export const coinService = new CoinService();

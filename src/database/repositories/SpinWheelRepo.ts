import { Types } from "mongoose";
import { SpinWheelModel } from "../models/SpinWheel";
import { SpinWheelStatus } from "../../types/SpinWheel";

async function findActive() {
  return SpinWheelModel.findOne({
    status: { $in: [SpinWheelStatus.WAITING, SpinWheelStatus.ACTIVE] },
  })
    .lean()
    .exec();
}

async function findById(id: Types.ObjectId) {
  return SpinWheelModel.findById(id).lean().exec();
}

async function create(createdBy: Types.ObjectId, entryFee: number) {
  return SpinWheelModel.create({ createdBy, entryFee });
}

async function updateStatus(id: Types.ObjectId, status: SpinWheelStatus) {
  return SpinWheelModel.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true },
  )
    .lean()
    .exec();
}

async function incrementParticipantCount(id: Types.ObjectId) {
  return SpinWheelModel.findByIdAndUpdate(
    id,
    { $inc: { participantsCount: 1 } },
    { new: true },
  )
    .lean()
    .exec();
}

async function addToPool(
  id: Types.ObjectId,
  winnerAmount: number,
  adminAmount: number,
  appAmount: number,
) {
  return SpinWheelModel.findByIdAndUpdate(
    id,
    {
      $inc: {
        totalWinnerPool: winnerAmount,
        totalAdminPool: adminAmount,
        totalAppPool: appAmount,
      },
    },
    { new: true },
  )
    .lean()
    .exec();
}

async function setEliminationOrder(
  id: Types.ObjectId,
  order: Types.ObjectId[],
) {
  return SpinWheelModel.findByIdAndUpdate(
    id,
    {
      $set: {
        eliminationSequence: order,
        status: SpinWheelStatus.ACTIVE,
        startedAt: new Date(),
      },
    },
    { new: true },
  )
    .lean()
    .exec();
}

async function advanceEliminationIndex(id: Types.ObjectId) {
  return SpinWheelModel.findByIdAndUpdate(
    id,
    { $inc: { currentEliminationIndex: 1 } },
    { new: true },
  )
    .lean()
    .exec();
}

async function markFinished(id: Types.ObjectId, winnerId: Types.ObjectId) {
  return SpinWheelModel.findByIdAndUpdate(
    id,
    {
      $set: {
        status: SpinWheelStatus.FINISHED,
        winner: winnerId,
        endedAt: new Date(),
      },
    },
    { new: true },
  )
    .lean()
    .exec();
}

export default {
  findActive,
  findById,
  create,
  updateStatus,
  incrementParticipantCount,
  addToPool,
  setEliminationOrder,
  advanceEliminationIndex,
  markFinished,
};

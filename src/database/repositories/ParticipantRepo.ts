import { Types } from "mongoose";
import { ParticipantModel } from "../models/Participant";

async function create(spinWheelId: Types.ObjectId, userId: Types.ObjectId) {
  return ParticipantModel.create({ spinWheelId, userId });
}

async function findActive(spinWheelId: Types.ObjectId) {
  return ParticipantModel.find({ spinWheelId, isEliminated: false })
    .lean()
    .exec();
}

async function findByUserAndWheel(
  spinWheelId: Types.ObjectId,
  userId: Types.ObjectId,
) {
  return ParticipantModel.findOne({ spinWheelId, userId }).lean().exec();
}

async function markEliminated(
  spinWheelId: Types.ObjectId,
  userId: Types.ObjectId,
) {
  return ParticipantModel.findOneAndUpdate(
    { spinWheelId, userId },
    { $set: { isEliminated: true, eliminatedAt: new Date() } },
    { new: true },
  )
    .lean()
    .exec();
}

async function findBySpinWheel(spinWheelId: Types.ObjectId) {
  return ParticipantModel.find({ spinWheelId }).lean().exec();
}

async function markWinner(spinWheelId: Types.ObjectId, userId: Types.ObjectId) {
  return ParticipantModel.findOneAndUpdate(
    { spinWheelId, userId },
    { $set: { isWinner: true } },
    { new: true },
  )
    .lean()
    .exec();
}

export default {
  create,
  findActive,
  findByUserAndWheel,
  markEliminated,
  findBySpinWheel,
  markWinner,
};

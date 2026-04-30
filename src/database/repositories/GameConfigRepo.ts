import { GameConfigModel } from "../models/GameConfig";

async function getActive() {
  return GameConfigModel.findOne({ isActive: true }).lean().exec();
}

async function create(
  winnerPercentage: number,
  adminPercentage: number,
  appPercentage: number,
) {
  await GameConfigModel.updateMany({}, { $set: { isActive: false } });
  return GameConfigModel.create({
    winnerPercentage,
    adminPercentage,
    appPercentage,
    version: Date.now(),
    isActive: true,
  });
}

export default { getActive, create };

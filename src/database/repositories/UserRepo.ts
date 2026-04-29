import User from "../../types/User";
import { InternalError } from "../../core/ApiError";
import { RoleModel } from "../models/Role";
import { UserModel } from "../models/User";
import KeystoreRepo from "./KeystoreRepo";
import { Types } from "mongoose";

async function findByEmail(email: string) {
  return UserModel.findOne({ email })
    .select("+name +email +password +roles +coins")
    .populate({ path: "roles", match: { status: true }, select: { code: 1 } })
    .lean()
    .exec();
}

async function create(
  user: User,
  accessTokenKey: string,
  refreshTokenKey: string,
  roleCode: string,
) {
  const role = await RoleModel.findOne({ code: roleCode })
    .select("+code")
    .lean()
    .exec();

  if (!role) throw new InternalError("Role must be defined.");

  user.roles = [role];
  const userCreated = await UserModel.create(user);
  const keystore = await KeystoreRepo.create(
    userCreated,
    accessTokenKey,
    refreshTokenKey,
  );

  return {
    user: { ...userCreated.toObject(), roles: user.roles },
    keystore,
  };
}

async function findById(id: Types.ObjectId) {
  return UserModel.findOne({ _id: id, status: true })
    .select("+email +name +roles +coins")
    .populate({ path: "roles", match: { status: true } })
    .lean()
    .exec();
}

async function updateCoins(userId: Types.ObjectId, newBalance: number) {
  return UserModel.findByIdAndUpdate(
    userId,
    { $set: { coins: newBalance } },
    { new: true, runValidators: true },
  )
    .lean()
    .exec();
}

export default { findByEmail, create, findById, updateCoins };

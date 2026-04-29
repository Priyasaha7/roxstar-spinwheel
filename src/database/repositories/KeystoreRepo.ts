import Keystore from "../../types/Keystore";
import User from "../../types/User";
import { KeystoreModel } from "../models/Keystore";
import { Types } from "mongoose";

async function create(
  client: User,
  primaryKey: string,
  secondaryKey: string,
): Promise<Keystore> {
  const keystore = await KeystoreModel.create({
    client: client._id,
    primaryKey,
    secondaryKey,
  });
  return keystore.toObject();
}

async function remove(id: Types.ObjectId) {
  return KeystoreModel.findByIdAndDelete(id).lean().exec();
}

async function findForKey(client: User, key: string) {
  return KeystoreModel.findOne({
    client: client._id,
    primaryKey: key,
    status: true,
  })
    .lean()
    .exec();
}

async function find(
  client: User,
  primaryKey: string,
  secondaryKey: string,
): Promise<Keystore | null> {
  return KeystoreModel.findOne({
    client: client._id,
    primaryKey,
    secondaryKey,
  })
    .lean()
    .exec();
}

export default { create, remove, findForKey, find };

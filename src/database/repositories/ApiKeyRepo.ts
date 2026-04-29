import { Permission } from "../../types/permissions";
import ApiKey from "../../types/ApiKey";
import { ApiKeyModel } from "../models/ApiKey";

async function findByKey(key: string): Promise<ApiKey | null> {
  return ApiKeyModel.findOne({ key: key, status: true }).lean().exec();
}

async function create(
  key: string,
  comments: string[],
  permissions: Permission[],
  version: number = 1,
) {
  return ApiKeyModel.create({ key, comments, permissions, version });
}

export default { findByKey, create };

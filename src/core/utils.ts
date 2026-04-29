import User from "../types/User";
import objectManipulator from "lodash";

export const enum Header {
  API_KEY = "x-api-key",
  AUTHORIZATION = "authorization",
}

export async function getUserData(user: User) {
  const data = objectManipulator.pick(user, [
    "_id",
    "name",
    "roles",
    "profilePicUrl",
    "email",
  ]);
  return data;
}

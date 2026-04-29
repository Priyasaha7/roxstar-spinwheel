import { Request } from "express";
import User from "./User";
import Keystore from "./Keystore";
import ApiKey from "./ApiKey";

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKey;
      user?: User;
      accessToken?: string;
      keystore?: Keystore;
    }
  }
}

export interface PublicRequest extends Request {
  apiKey: ApiKey;
}

export interface RoleRequest extends PublicRequest {
  currentRoleCodes: string[];
}

export interface ProtectedRequest extends RoleRequest {
  user: User;
  accessToken: string;
  keystore: Keystore;
}

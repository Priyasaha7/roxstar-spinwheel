import { RequestHandler } from "express";
import { RoleCode } from "../types/Role";
import { ProtectedRequest } from "../types/app-requests";
import { ForbiddenError } from "../core/ApiError";

export const authorize = (...allowedRoles: RoleCode[]): RequestHandler => {
  return (req, _res, next) => {
    try {
      const protectedReq = req as unknown as ProtectedRequest;
      if (!protectedReq.user)
        throw new ForbiddenError("Authentication required");

      const userRoles = protectedReq.user.roles.map((r) => r.code as RoleCode);
      const hasRole = userRoles.some((role) => allowedRoles.includes(role));
      if (!hasRole)
        throw new ForbiddenError(`Required role: [${allowedRoles.join(", ")}]`);

      next();
    } catch (error) {
      next(error);
    }
  };
};

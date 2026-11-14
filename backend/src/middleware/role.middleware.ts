
import type { RequestHandler } from "express";

// Check whether the authenticated user's role is allowed.
export function authorizeRoles(
  ...allowedRoles: string[]
): RequestHandler {
  if (allowedRoles.length === 0) {
    throw new Error("At least one allowed role must be specified");
  }

  return (req, res, next) => {
    // Authentication must run before authorization.
    if (!req.auth) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    // Verify the user's role.
    if (!allowedRoles.includes(req.auth.role)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });
      return;
    }

    next();
  };
}

import type { Request, RequestHandler } from "express";

import {
  verifyToken,
  type AuthTokenPayload,
} from "../modules/auth/jwt.service.js";

// Attach verified authentication data to Express requests.
declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

// Middleware to protect authenticated routes.
export const authenticateToken: RequestHandler = (
  req,
  res,
  next
) => {
  const authorizationHeader = req.get("authorization");

  // Check whether the Authorization header exists.
  if (!authorizationHeader) {
    res.status(401).json({
      success: false,
      message: "Authentication token is required",
    });
    return;
  }

  // Extract the Bearer token.
  const [scheme, token, ...extraParts] =
    authorizationHeader.trim().split(/\s+/);

  if (
    scheme?.toLowerCase() !== "bearer" ||
    !token ||
    extraParts.length > 0
  ) {
    res.status(401).json({
      success: false,
      message: "Invalid authorization header format",
    });
    return;
  }

  try {
    // Verify the token using the RSA public key.
    const verifiedPayload = verifyToken(token);

    // Attach verified identity to the request.
    req.auth = verifiedPayload;

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
};


import jwt, { type SignOptions } from "jsonwebtoken";

import { privateKey, publicKey } from "../../config/jwt.js";
import { env } from "../../config/env.js";

// LedgerGuard JWT payload
export interface AuthTokenPayload {
  userId: string;
  organizationId: string;
  role: string;
}

// Generate a signed JWT using the RSA private key
export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    expiresIn: env.JWT_ACCESS_TOKEN_TTL as SignOptions["expiresIn"],
  });
}

// Verify JWT using the RSA public key
export function verifyToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, publicKey, {
    algorithms: ["RS256"],
  });

  if (
    typeof decoded === "string" ||
    typeof decoded.userId !== "string" ||
    typeof decoded.organizationId !== "string" ||
    typeof decoded.role !== "string"
  ) {
    throw new Error("Invalid authentication token payload");
  }

  return {
    userId: decoded.userId,
    organizationId: decoded.organizationId,
    role: decoded.role,
  };
}

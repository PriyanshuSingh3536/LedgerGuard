import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import {
  signToken,
  verifyToken,
} from "../src/modules/auth/jwt.service.js";

import { privateKey } from "../src/config/jwt.js";

// Test payload
const payload = {
  userId: "user-123",
  organizationId: "org-456",
  role: "admin",
};

// Test 1: Generate a valid RS256 token.
const token = signToken(payload);

assert.equal(typeof token, "string");
assert.equal(jwt.decode(token)?.valueOf() instanceof Object, true);

console.log("PASS: JWT token is generated successfully");

// Test 2: Verify token and check its payload.
const decoded = verifyToken(token);

assert.deepEqual(decoded, payload);

console.log("PASS: Valid JWT returns the correct user payload");

// Test 3: Reject a tampered token.
const [header, body, signature] = token.split(".");
const tamperedSignature =
  (signature[0] === "a" ? "b" : "a") + signature.slice(1);

assert.throws(
  () => verifyToken(`${header}.${body}.${tamperedSignature}`),
);

console.log("PASS: Tampered JWT is rejected");

// Test 4: Reject an invalid token.
assert.throws(
  () => verifyToken("invalid.token.value"),
);

console.log("PASS: Invalid JWT is rejected");

// Test 5: Reject a token with missing required payload fields.
const invalidPayloadToken = jwt.sign(
  { unexpected: true },
  privateKey,
  {
    algorithm: "RS256",
    expiresIn: "1h",
  },
);

assert.throws(
  () => verifyToken(invalidPayloadToken),
  /Invalid authentication token payload/,
);

console.log("PASS: JWT with invalid payload is rejected");

console.log("All JWT service tests passed!");

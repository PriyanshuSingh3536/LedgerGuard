
import assert from "node:assert/strict";
import type { Request, Response, NextFunction } from "express";

import {
  verifyTenantIsolation,
} from "../src/database-security/tenant-isolation.js";

function runMiddleware(
  tenantId?: string,
  resourceTenantId?: string,
  auth: unknown = { organizationId: tenantId }
) {
  const req = {
    auth,
    tenantId,
    params: {
      organizationId: resourceTenantId,
    },
  } as unknown as Request;

  let statusCode = 200;
  let responseBody: unknown;
  let nextCalled = false;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      responseBody = body;
      return this;
    },
  } as unknown as Response;

  const next: NextFunction = () => {
    nextCalled = true;
  };

  verifyTenantIsolation(req, res, next);

  return { statusCode, responseBody, nextCalled };
}

// Test 1: Same tenant should be allowed.
{
  const result = runMiddleware("org-123", "org-123");
  assert.equal(result.nextCalled, true);
  console.log("PASS: Same tenant access allowed");
}

// Test 2: Different tenant should be blocked.
{
  const result = runMiddleware("org-123", "org-456");
  assert.equal(result.statusCode, 403);
  assert.equal(result.nextCalled, false);
  console.log("PASS: Cross-tenant access blocked");
}

// Test 3: Missing tenant context should be blocked.
{
  const result = runMiddleware(undefined, "org-123");
  assert.equal(result.statusCode, 401);
  assert.equal(result.nextCalled, false);
  console.log("PASS: Missing tenant context blocked");
}

// Test 4: Missing resource organization ID.
{
  const result = runMiddleware("org-123");
  assert.equal(result.statusCode, 400);
  assert.equal(result.nextCalled, false);
  console.log("PASS: Missing resource organization ID blocked");
}

// Test 5: Missing authentication should be blocked.
{
  const result = runMiddleware(
    "org-123",
    "org-123",
    null
  );

  assert.equal(result.statusCode, 401);
  assert.equal(result.nextCalled, false);
  console.log("PASS: Missing authentication blocked");
}

console.log("All tenant isolation tests passed!");

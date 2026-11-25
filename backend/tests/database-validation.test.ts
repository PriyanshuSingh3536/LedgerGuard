
import assert from "node:assert/strict";
import type { Request, Response, NextFunction } from "express";

import { validateTenantDatabase } from "../src/database-security/database-validation.js";

function runMiddleware(
  auth?: unknown,
  tenantId?: string,
  readyState?: number
) {
  const req = {
    auth,
    tenantId,
    tenantConnection:
      readyState === undefined
        ? undefined
        : { readyState },
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

  validateTenantDatabase(req, res, next);

  return { statusCode, responseBody, nextCalled };
}

// Test 1: Missing authentication.
{
  const result = runMiddleware(undefined, "org-123", 1);
  assert.equal(result.statusCode, 401);
  assert.equal(result.nextCalled, false);
  console.log("PASS: Missing authentication blocked");
}

// Test 2: Missing tenant context.
{
  const result = runMiddleware({ organizationId: "org-123" }, undefined, 1);
  assert.equal(result.statusCode, 401);
  assert.equal(result.nextCalled, false);
  console.log("PASS: Missing tenant context blocked");
}

// Test 3: Missing database connection.
{
  const result = runMiddleware({ organizationId: "org-123" }, "org-123");
  assert.equal(result.statusCode, 503);
  assert.equal(result.nextCalled, false);
  console.log("PASS: Missing database connection blocked");
}

// Test 4: Inactive database connection.
{
  const result = runMiddleware({ organizationId: "org-123" }, "org-123", 0);
  assert.equal(result.statusCode, 503);
  assert.equal(result.nextCalled, false);
  console.log("PASS: Inactive database connection blocked");
}

// Test 5: Active database connection.
{
  const result = runMiddleware({ organizationId: "org-123" }, "org-123", 1);
  assert.equal(result.statusCode, 200);
  assert.equal(result.nextCalled, true);
  console.log("PASS: Active database connection allowed");
}

console.log("All database validation tests passed!");

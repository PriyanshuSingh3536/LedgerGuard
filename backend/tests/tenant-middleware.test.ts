
import assert from "node:assert/strict";
import type { Request, Response, NextFunction } from "express";

import { resolveTenant } from "../src/middleware/tenant.middleware.js";

function runMiddleware(auth?: unknown) {
  const req = {
    auth,
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

  resolveTenant(req, res, next);

  return {
    req,
    statusCode,
    responseBody,
    nextCalled,
  };
}

// Test 1: Authentication missing
{
  const result = runMiddleware();

  assert.equal(result.statusCode, 401);
  assert.equal(result.nextCalled, false);

  console.log("PASS: Missing authentication returns 401");
}

// Test 2: Organization ID missing
{
  const result = runMiddleware({});

  assert.equal(result.statusCode, 403);
  assert.equal(result.nextCalled, false);

  console.log("PASS: Missing organization ID returns 403");
}

// Test 3: Organization ID empty
{
  const result = runMiddleware({
    organizationId: "   ",
  });

  assert.equal(result.statusCode, 403);
  assert.equal(result.nextCalled, false);

  console.log("PASS: Empty organization ID returns 403");
}

// Test 4: Valid organization ID
{
  const result = runMiddleware({
    organizationId: "org-123",
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.req.tenantId, "org-123");
  assert.equal(result.nextCalled, true);

  console.log("PASS: Valid organization ID resolves tenant");
}

console.log("All tenant middleware tests passed!");

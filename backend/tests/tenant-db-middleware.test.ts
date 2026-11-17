
import assert from "node:assert/strict";
import mongoose, { type Connection } from "mongoose";
import type { Request, Response, NextFunction } from "express";

process.env.MONGODB_URI =
  "mongodb://127.0.0.1:27017/ledgerguard_test";

async function runTests() {
  const originalCreateConnection = mongoose.createConnection;

  let createCount = 0;
  let closeCount = 0;
  let failNextConnection = false;

  Object.defineProperty(mongoose, "createConnection", {
    configurable: true,
    value: () => {
      createCount++;

      const fakeConnection = {
        asPromise: async () => {
          if (failNextConnection) {
            failNextConnection = false;
            throw new Error("Simulated database failure");
          }

          return fakeConnection;
        },
        close: async () => {
          closeCount++;
        },
      };

      return fakeConnection as unknown as Connection;
    },
  });

  try {
    const { attachTenantDatabase } =
      await import("../src/middleware/tenant-db.middleware.js");

    async function runMiddleware(tenantId?: string) {
      const req = {
        tenantId,
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

      await attachTenantDatabase(req, res, next);

      return {
        req,
        statusCode,
        responseBody,
        nextCalled,
      };
    }

    // Test 1: Missing tenant ID
    {
      const result = await runMiddleware();

      assert.equal(result.statusCode, 403);
      assert.equal(result.nextCalled, false);
      assert.equal(createCount, 0);

      console.log("PASS: Missing tenant ID returns 403");
    }

    // Test 2: Successful database connection
    {
      const result = await runMiddleware("tenant-test-1");

      assert.equal(result.statusCode, 200);
      assert.ok(result.req.tenantConnection);
      assert.equal(result.nextCalled, true);
      assert.equal(createCount, 1);

      console.log("PASS: Database connection attaches to request");
    }

    // Test 3: Database connection failure
    {
      failNextConnection = true;

      const result = await runMiddleware("tenant-test-2");

      assert.equal(result.statusCode, 503);
      assert.equal(result.nextCalled, false);
      assert.equal(closeCount, 1);

      console.log("PASS: Database failure returns 503");
    }

    console.log("All tenant database middleware tests passed!");
  } finally {
    Object.defineProperty(mongoose, "createConnection", {
      configurable: true,
      writable: true,
      value: originalCreateConnection,
    });
  }
}

runTests().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

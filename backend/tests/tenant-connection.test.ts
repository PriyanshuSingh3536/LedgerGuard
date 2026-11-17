
import assert from "node:assert/strict";
import mongoose, { type Connection } from "mongoose";

// Set test URI before loading the environment configuration.
process.env.MONGODB_URI =
  "mongodb://127.0.0.1:27017/ledgerguard_test";

async function runTests() {
  const originalCreateConnection = mongoose.createConnection;

  let createCount = 0;
  let closeCount = 0;
  let failNextConnection = false;

  const createdDatabaseNames: string[] = [];

  // Replace Mongoose connection creation with a mock.
  Object.defineProperty(mongoose, "createConnection", {
    configurable: true,
    value: (_uri: string, options: { dbName?: string }) => {
      createCount++;

      if (options.dbName) {
        createdDatabaseNames.push(options.dbName);
      }

      const fakeConnection = {
        asPromise: async () => {
          if (failNextConnection) {
            failNextConnection = false;
            throw new Error("Simulated connection failure");
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
    const {
      getTenantConnection,
      closeTenantConnection,
    } = await import("../src/config/database.js");

    // Test 1: Same tenant should reuse its connection.
    const connectionA1 = await getTenantConnection("tenant-test-1");
    const connectionA2 = await getTenantConnection("tenant-test-1");

    assert.equal(connectionA1, connectionA2);
    assert.equal(createCount, 1);

    console.log("PASS: Same tenant reuses its existing connection");

    // Test 2: Different tenants should get separate connections.
    const connectionB = await getTenantConnection("tenant-test-2");

    assert.notEqual(connectionA1, connectionB);
    assert.equal(createCount, 2);

    console.log("PASS: Different tenants get separate connections");

    // Test 3: Failed connection should be removed from the cache.
    failNextConnection = true;

    await assert.rejects(
      getTenantConnection("tenant-test-3"),
      /Simulated connection failure/
    );

    assert.equal(closeCount, 1);

    const connectionAfterFailure =
      await getTenantConnection("tenant-test-3");

    assert.ok(connectionAfterFailure);
    assert.equal(createCount, 4);

    console.log("PASS: Failed connection is cleaned up and can be retried");

    // Test 4: Closing a tenant connection should remove it from the cache.
    await closeTenantConnection("tenant-test-1");

    assert.equal(closeCount, 2);

    const connectionAfterClose =
      await getTenantConnection("tenant-test-1");

    assert.notEqual(connectionA1, connectionAfterClose);
    assert.equal(createCount, 5);

    console.log("PASS: Closed connection is removed and recreated");

    console.log("All tenant connection manager tests passed!");
  } finally {
    Object.defineProperty(mongoose, "createConnection", {
      configurable: true,
      writable: true,
      value: originalCreateConnection,
    });
  }
}

runTests().catch((error) => {
  console.error("Tenant connection tests failed:", error);
  process.exitCode = 1;
});

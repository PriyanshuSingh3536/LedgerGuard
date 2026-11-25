import assert from "node:assert/strict";
import mongoose, { type Connection } from "mongoose";

process.env.MONGODB_URI =
  "mongodb://127.0.0.1:27017/ledgerguard_test";

async function runTests() {
  const originalCreateConnection = mongoose.createConnection;

  let createCount = 0;
  let closeCount = 0;

  const createdDatabaseNames: string[] = [];

  Object.defineProperty(mongoose, "createConnection", {
    configurable: true,
    value: (_uri: string, options: { dbName?: string }) => {
      createCount++;

      if (options.dbName) {
        createdDatabaseNames.push(options.dbName);
      }

      const fakeConnection = {
        readyState: 1,

        asPromise: async () => fakeConnection,

        close: async () => {
          fakeConnection.readyState = 0;
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

    const tenantIds = Array.from(
      { length: 20 },
      (_, index) => `load-test-tenant-${index + 1}`
    );

    const requestsPerTenant = 25;

    const results = await Promise.all(
      tenantIds.flatMap((tenantId) =>
        Array.from(
          { length: requestsPerTenant },
          () => getTenantConnection(tenantId)
        )
      )
    );

    assert.equal(results.length, 500);

    const tenantConnections = new Map<string, Connection>();

    let resultIndex = 0;

    for (const tenantId of tenantIds) {
      const tenantResults = results.slice(
        resultIndex,
        resultIndex + requestsPerTenant
      );

      resultIndex += requestsPerTenant;

      const firstConnection = tenantResults[0];

      assert.ok(
        tenantResults.every(
          (connection) => connection === firstConnection
        ),
        `Connection mismatch for ${tenantId}`
      );

      tenantConnections.set(tenantId, firstConnection);
    }

    const uniqueConnections = new Set(
      tenantConnections.values()
    );

    assert.equal(uniqueConnections.size, 20);

    assert.equal(createCount, 20);

    assert.equal(
      new Set(createdDatabaseNames).size,
      20
    );

    console.log("PASS: 500 concurrent tenant requests completed");
    console.log("PASS: 20 tenants received 20 separate connections");
    console.log("PASS: Each tenant reused its own connection");
    console.log("PASS: No cross-tenant connection mixing detected");
    console.log("Connections created:", createCount);
    console.log("Unique database names:", createdDatabaseNames.length);

    await Promise.all(
      tenantIds.map((tenantId) =>
        closeTenantConnection(tenantId)
      )
    );

    assert.equal(closeCount, 20);

    console.log("PASS: All 20 tenant connections closed successfully");
    console.log("All tenant connection load tests passed!");
  } finally {
    Object.defineProperty(mongoose, "createConnection", {
      configurable: true,
      writable: true,
      value: originalCreateConnection,
    });
  }
}

runTests().catch((error) => {
  console.error("Tenant connection load tests failed:", error);
  process.exitCode = 1;
});

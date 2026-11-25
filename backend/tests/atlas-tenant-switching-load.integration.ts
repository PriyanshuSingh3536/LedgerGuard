import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  getTenantConnection,
  closeTenantConnection,
} from "../src/config/database.js";

async function runAtlasTenantSwitchingLoadTest(): Promise<void> {
  const runId = randomUUID();

  const tenantIds = Array.from(
    { length: 10 },
    (_, index) => `atlas-load-${runId}-${index + 1}`
  );

  const requestsPerTenant = 5;

  try {
    const startTime = Date.now();

    // Open actual Atlas connections for all tenants concurrently.
    const connections = await Promise.all(
      tenantIds.map((tenantId) =>
        getTenantConnection(tenantId)
      )
    );

    assert.equal(connections.length, 10);

    assert.equal(
      new Set(connections).size,
      10,
      "Different tenants must receive different connections"
    );

    const databaseNames = connections.map(
      (connection) => connection.name
    );

    assert.equal(
      new Set(databaseNames).size,
      10,
      "Each tenant must use a unique database"
    );

    console.log("PASS: 10 actual Atlas tenant connections opened");
    console.log("PASS: All 10 tenants have separate connections");
    console.log("PASS: All 10 tenants have unique database names");

    // Execute real MongoDB ping operations concurrently.
    const pingResults = await Promise.all(
      tenantIds.flatMap((tenantId) =>
        Array.from(
          { length: requestsPerTenant },
          async () => {
            const connection =
              await getTenantConnection(tenantId);

            const result = await connection.db!.command({
              ping: 1,
            });

            assert.equal(
              result.ok,
              1,
              `Atlas ping failed for ${tenantId}`
            );

            return connection;
          }
        )
      )
    );

    assert.equal(pingResults.length, 50);

    // Verify that every request used its tenant's original connection.
    let index = 0;

    for (const connection of connections) {
      const tenantResults = pingResults.slice(
        index,
        index + requestsPerTenant
      );

      index += requestsPerTenant;

      assert.ok(
        tenantResults.every(
          (result) => result === connection
        ),
        "Tenant connection reuse or isolation failed"
      );
    }

    console.log("PASS: 50 actual Atlas ping operations completed");
    console.log("PASS: Tenant connection reuse verified");
    console.log("PASS: No cross-tenant connection mixing detected");
    console.log("Execution time:", Date.now() - startTime, "ms");

  } finally {
    await Promise.all(
      tenantIds.map((tenantId) =>
        closeTenantConnection(tenantId)
      )
    );

    console.log("PASS: All tenant connections closed");
  }
}

runAtlasTenantSwitchingLoadTest().catch((error: unknown) => {
  console.error(
    "Atlas tenant switching load test failed:",
    error
  );

  process.exitCode = 1;
});

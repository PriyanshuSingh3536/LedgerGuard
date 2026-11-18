
import { randomUUID } from "node:crypto";

import {
  getTenantConnection,
  closeTenantConnection,
} from "../src/config/database.js";

const organizationId = "ledgerguard-atlas-integration-test";

async function runAtlasTransactionTest(): Promise<void> {
  const connection = await getTenantConnection(organizationId);
  const session = await connection.startSession();

  const probeId = randomUUID();
  const collection = connection.db!.collection<{
  _id: string;
}>("ledgerguard_transaction_probe");

  try {
    // Ensure the test collection exists before starting a transaction.
    const collectionExists = await connection.db!
      .listCollections(
        { name: "ledgerguard_transaction_probe" }
      )
      .hasNext();

    if (!collectionExists) {
      await connection.db!.createCollection(
        "ledgerguard_transaction_probe"
      );
    }

    // Intentionally fail after inserting a document.
    try {
      await session.withTransaction(async () => {
        await collection.insertOne(
          { _id: probeId },
          { session }
        );

        throw new Error("ROLLBACK_PROBE");
      });
    } catch (error) {
      if (
        !(error instanceof Error) ||
        error.message !== "ROLLBACK_PROBE"
      ) {
        throw error;
      }
    }

    // Verify that the inserted document was rolled back.
    const savedDocument = await collection.findOne({
      _id: probeId,
    });

    if (savedDocument) {
      throw new Error(
        "Rollback failed: probe document still exists"
      );
    }

    console.log(
      "MongoDB Atlas connection:",
      connection.readyState === 1 ? "CONNECTED" : "NOT CONNECTED"
    );

    console.log("Tenant database:", connection.name);
    console.log("MongoDB transaction rollback: VERIFIED");
  } finally {
    await session.endSession();
    await closeTenantConnection(organizationId);
  }
}

runAtlasTransactionTest().catch((error: unknown) => {
  console.error(
    "Atlas transaction test failed:",
    error instanceof Error ? error.message : error
  );

  process.exitCode = 1;
});

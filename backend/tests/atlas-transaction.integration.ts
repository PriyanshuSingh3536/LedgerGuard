
import { randomUUID } from "node:crypto";

import {
  getTenantConnection,
  closeTenantConnection,
} from "../src/config/database.js";

const organizationId = "ledgerguard-atlas-integration-test";

async function runAtlasTransactionTest(): Promise<void> {
  const connection = await getTenantConnection(organizationId);
  const session = await connection.startSession();

  const commitProbeId = randomUUID();
  const rollbackProbeId = randomUUID();

  const collection = connection.db!.collection<{
    _id: string;
  }>("ledgerguard_transaction_probe");

  try {
    // Ensure the test collection exists before starting transactions.
    const collectionExists = await connection.db!
      .listCollections({
        name: "ledgerguard_transaction_probe",
      })
      .hasNext();

    if (!collectionExists) {
      await connection.db!.createCollection(
        "ledgerguard_transaction_probe"
      );
    }

    // Test 1: Successful transaction commit.
    await session.withTransaction(async () => {
      await collection.insertOne(
        { _id: commitProbeId },
        { session }
      );
    });

    const committedDocument = await collection.findOne({
      _id: commitProbeId,
    });

    if (!committedDocument) {
      throw new Error(
        "Commit failed: document was not saved"
      );
    }

    console.log(
      "PASS: MongoDB transaction commit verified"
    );

    // Test 2: Failed transaction rollback.
    try {
      await session.withTransaction(async () => {
        await collection.insertOne(
          { _id: rollbackProbeId },
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

    const rolledBackDocument = await collection.findOne({
      _id: rollbackProbeId,
    });

    if (rolledBackDocument) {
      throw new Error(
        "Rollback failed: probe document still exists"
      );
    }

    console.log(
      "PASS: MongoDB transaction rollback verified"
    );

    console.log(
      "MongoDB Atlas connection:",
      connection.readyState === 1 ? "CONNECTED" : "NOT CONNECTED"
    );

    console.log("Tenant database:", connection.name);
    console.log("All Atlas transaction tests passed!");
  } finally {
    // Remove test documents.
    await collection.deleteMany({
      _id: {
        $in: [commitProbeId, rollbackProbeId],
      },
    }).catch(() => undefined);

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

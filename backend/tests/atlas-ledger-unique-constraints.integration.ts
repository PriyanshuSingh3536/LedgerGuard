
import { randomUUID } from "node:crypto";

import {
  getTenantConnection,
  closeTenantConnection,
} from "../src/config/database.js";

import { getLedgerModels } from "../src/modules/ledger/ledger.model.js";

const organizationId = "ledgerguard-atlas-integration-test";

async function expectDuplicateKeyError(
  operation: () => Promise<unknown>,
  testName: string
): Promise<void> {
  try {
    await operation();
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      console.log(`PASS: ${testName}`);
      return;
    }

    throw error;
  }

  throw new Error(`FAIL: ${testName} was not rejected`);
}

async function verifyUniqueConstraints(): Promise<void> {
  const connection = await getTenantConnection(organizationId);

  const eventId = `test-event-${randomUUID()}`;
  const transactionId = `test-transaction-${randomUUID()}`;

  const duplicateTransactionId = `test-transaction-${randomUUID()}`;
  const duplicateEventId = `test-event-${randomUUID()}`;

  try {
    const { LedgerTransactionModel } = getLedgerModels(connection);

    await LedgerTransactionModel.init();

    // Insert the original test transaction.
    await LedgerTransactionModel.create({
      eventId,
      transactionId,
      currency: "INR",
      description: "Atlas unique index integration test",
    });

    // Attempt to insert a duplicate eventId.
    await expectDuplicateKeyError(
      () =>
        LedgerTransactionModel.create({
          eventId,
          transactionId: duplicateTransactionId,
          currency: "INR",
          description: "Duplicate eventId test",
        }),
      "Atlas rejects duplicate eventId"
    );

    // Attempt to insert a duplicate transactionId.
    await expectDuplicateKeyError(
      () =>
        LedgerTransactionModel.create({
          eventId: duplicateEventId,
          transactionId,
          currency: "INR",
          description: "Duplicate transactionId test",
        }),
      "Atlas rejects duplicate transactionId"
    );

    console.log("\nTenant database:", connection.name);
    console.log("MongoDB Atlas unique constraints: VERIFIED");
  } finally {
    // Delete only records belonging to this test.
    const { LedgerTransactionModel } = getLedgerModels(connection);

    await LedgerTransactionModel.deleteMany({
      eventId: {
        $in: [eventId, duplicateEventId],
      },
    });

    await closeTenantConnection(organizationId);
  }
}

verifyUniqueConstraints().catch((error: unknown) => {
  console.error(
    "Unique constraint test failed:",
    error instanceof Error ? error.message : error
  );

  process.exitCode = 1;
});



import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  getTenantConnection,
  closeTenantConnection,
} from "../src/config/database.js";

import { getLedgerModels } from "../src/modules/ledger/ledger.model.js";

import { createLedgerTransaction } from "../src/modules/ledger/ledger.service.js";

const organizationId = "ledgerguard-atlas-integration-test";

async function runAtlasLedgerIntegrationTest(): Promise<void> {
  const eventId = `atlas-event-${randomUUID()}`;
  const transactionId = `atlas-txn-${randomUUID()}`;

  const connection = await getTenantConnection(organizationId);

  const {
    LedgerTransactionModel,
    LedgerEntryModel,
  } = getLedgerModels(connection);

  try {
    // Ensure indexes are created before inserting test records.
    await Promise.all([
      LedgerTransactionModel.init(),
      LedgerEntryModel.init(),
    ]);

    // Create a real ledger transaction through the service.
    const result = await createLedgerTransaction(
      organizationId,
      {
        eventId,
        transactionId,
        currency: "INR",
        description: "Atlas ledger service integration test",
        entries: [
          {
            accountId: "atlas-test-account-A",
            side: "debit",
            amount: 10000,
          },
          {
            accountId: "atlas-test-account-B",
            side: "credit",
            amount: 10000,
          },
        ],
      }
    );

    assert.ok(result, "Ledger transaction should be returned");

    // Verify the main transaction exists in Atlas.
    const savedTransaction =
      await LedgerTransactionModel.findOne({ eventId }).lean().exec();

    assert.ok(savedTransaction, "Transaction document was not saved");

    assert.equal(savedTransaction.transactionId, transactionId);
    assert.equal(savedTransaction.currency, "INR");

    console.log("PASS: Ledger transaction saved in Atlas");

    // Verify individual debit and credit entries exist.
    const savedEntries = await LedgerEntryModel.find({
      transactionId,
    }).lean().exec();

    assert.equal(savedEntries.length, 2);

    const debitEntry = savedEntries.find(
      (entry) => entry.side === "debit"
    );

    const creditEntry = savedEntries.find(
      (entry) => entry.side === "credit"
    );

    assert.ok(debitEntry, "Debit entry was not saved");
    assert.ok(creditEntry, "Credit entry was not saved");

    assert.equal(debitEntry.amount, 10000);
    assert.equal(creditEntry.amount, 10000);

    assert.equal(debitEntry.accountId, "atlas-test-account-A");
    assert.equal(creditEntry.accountId, "atlas-test-account-B");

    console.log("PASS: Debit and credit entries saved in Atlas");

    // Verify that both entries belong to the same transaction.
    assert.ok(
      savedEntries.every(
        (entry) => entry.transactionId === savedTransaction.transactionId
      )
    );

    console.log("PASS: Ledger entries linked to the transaction");
    console.log("\nMongoDB Atlas ledger service integration: VERIFIED");
    console.log("Tenant database:", connection.name);
  } finally {
    // Delete only records created by this integration test.
    await LedgerEntryModel.deleteMany({ transactionId });

    await LedgerTransactionModel.deleteMany({ eventId });

    await closeTenantConnection(organizationId);
  }
}

runAtlasLedgerIntegrationTest().catch((error: unknown) => {
  console.error(
    "Atlas ledger integration test failed:",
    error instanceof Error ? error.message : error
  );

  process.exitCode = 1;
});

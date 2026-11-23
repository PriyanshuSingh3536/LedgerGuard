
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  getTenantConnection,
  closeTenantConnection,
} from "../src/config/database.js";

import { redisClient } from "../src/config/redis.js";

import { getLedgerModels } from "../src/modules/ledger/ledger.model.js";

import { createLedgerTransaction } from "../src/modules/ledger/ledger.service.js";

const organizationId = "ledgerguard-atlas-integration-test";

function createInput(eventId: string, transactionId: string) {
  return {
    eventId,
    transactionId,
    currency: "INR",
    description: "Atlas Redis concurrency integration test",
    entries: [
      {
        accountId: "concurrency-test-account-A",
        side: "debit" as const,
        amount: 10000,
      },
      {
        accountId: "concurrency-test-account-B",
        side: "credit" as const,
        amount: 10000,
      },
    ],
  };
}

async function runIntegrationTest(): Promise<void> {
  const sequentialEventId = `seq-event-${randomUUID()}`;
  const sequentialTransactionId = `seq-txn-${randomUUID()}`;

  const concurrentEventId = `concurrent-event-${randomUUID()}`;
  const concurrentTransactionId = `concurrent-txn-${randomUUID()}`;

  const eventA = `lock-event-A-${randomUUID()}`;
  const eventB = `lock-event-B-${randomUUID()}`;
  const sharedTransactionId = `shared-txn-${randomUUID()}`;

  const eventIds = [
    sequentialEventId,
    concurrentEventId,
    eventA,
    eventB,
  ];

  const transactionIds = [
    sequentialTransactionId,
    concurrentTransactionId,
    sharedTransactionId,
  ];

  const connection = await getTenantConnection(organizationId);

  const {
    LedgerTransactionModel,
    LedgerEntryModel,
  } = getLedgerModels(connection);

  try {
    await Promise.all([
      LedgerTransactionModel.init(),
      LedgerEntryModel.init(),
    ]);

    // TEST 1: Sequential duplicate event.
    const firstResult = await createLedgerTransaction(
      organizationId,
      createInput(sequentialEventId, sequentialTransactionId)
    );

    const secondResult = await createLedgerTransaction(
      organizationId,
      createInput(sequentialEventId, sequentialTransactionId)
    );

    assert.equal(
      String(firstResult._id),
      String(secondResult._id),
      "Duplicate request should return the existing transaction"
    );

    const sequentialCount = await LedgerTransactionModel.countDocuments({
      eventId: sequentialEventId,
    });

    assert.equal(sequentialCount, 1);

    console.log("PASS: Sequential duplicate event handled");

    // TEST 2: Simultaneous requests with the same eventId.
    const concurrentResults = await Promise.allSettled([
      createLedgerTransaction(
        organizationId,
        createInput(concurrentEventId, concurrentTransactionId)
      ),
      createLedgerTransaction(
        organizationId,
        createInput(concurrentEventId, concurrentTransactionId)
      ),
    ]);

    const concurrentCount = await LedgerTransactionModel.countDocuments({
      eventId: concurrentEventId,
    });

    const concurrentEntries = await LedgerEntryModel.countDocuments({
      transactionId: concurrentTransactionId,
    });

    assert.equal(concurrentCount, 1);
    assert.equal(concurrentEntries, 2);

    assert.ok(
      concurrentResults.some((result) => result.status === "fulfilled"),
      "At least one concurrent request should succeed"
    );

    console.log("PASS: Concurrent duplicate event did not create duplicates");

    // TEST 3: Different events competing for the same transactionId.
    const lockResults = await Promise.allSettled([
      createLedgerTransaction(
        organizationId,
        createInput(eventA, sharedTransactionId)
      ),
      createLedgerTransaction(
        organizationId,
        createInput(eventB, sharedTransactionId)
      ),
    ]);

    const sharedTransactionCount =
      await LedgerTransactionModel.countDocuments({
        transactionId: sharedTransactionId,
      });

    const sharedEntriesCount = await LedgerEntryModel.countDocuments({
      transactionId: sharedTransactionId,
    });

    assert.equal(sharedTransactionCount, 1);
    assert.equal(sharedEntriesCount, 2);

    assert.equal(
      lockResults.filter((result) => result.status === "fulfilled").length,
      1,
      "Exactly one competing transaction should succeed"
    );

    console.log("PASS: Distributed lock prevented competing transactions");

    console.log("\nAtlas + Redis concurrency integration: VERIFIED");
    console.log("Tenant database:", connection.name);
  } finally {
    // Remove only the records created by this test.
    await LedgerEntryModel.deleteMany({
      transactionId: { $in: transactionIds },
    });

    await LedgerTransactionModel.deleteMany({
      eventId: { $in: eventIds },
    });

    // Remove only this test's Redis idempotency and lock keys.
    const redisKeys = [
      ...eventIds.map(
        (id) =>
          `ledgerguard:idempotency:${encodeURIComponent(organizationId)}:${encodeURIComponent(id)}`
      ),
      ...transactionIds.map(
        (id) =>
          `ledgerguard:lock:${encodeURIComponent(organizationId)}:${encodeURIComponent(id)}`
      ),
    ];

    await redisClient.del(...redisKeys);

    await closeTenantConnection(organizationId);
  }
}

runIntegrationTest().catch((error: unknown) => {
  console.error(
    "Atlas + Redis concurrency integration failed:",
    error instanceof Error ? error.message : error
  );

  process.exitCode = 1;
});

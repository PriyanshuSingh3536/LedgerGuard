
import assert from "node:assert/strict";
import { mock } from "node:test";

let connectionCalls = 0;
let createCalls = 0;
let findOneCalls = 0;
let insertManyCalls = 0;
let commitCount = 0;
let rollbackCount = 0;
let endSessionCount = 0;

let completeIdempotencyCalls = 0;
let releaseIdempotencyCalls = 0;
let recoverIdempotencyCalls = 0;
let acquireLockCalls = 0;
let releaseLockCalls = 0;
let extendLockCalls = 0;

let heartbeatCallback: (() => Promise<void>) | undefined;
let triggerHeartbeatDuringTransaction = false;
let extendLockResult = true;
let insertManyError: Error | null = null;
let idempotencyStatus: "acquired" | "completed" | "processing" = "acquired";
let lockAcquired = true;
let existingTransaction: typeof fakeTransaction | null = null;

const fakeTransaction = {
  _id: "transaction-doc-101",
  eventId: "event-101",
  transactionId: "TXN-101",
};

const fakeSession = {
  withTransaction: async (callback: () => Promise<void>) => {
    try {
      await callback();
      commitCount++;
    } catch (error) {
      rollbackCount++;
      throw error;
    }
  },
  endSession: async () => {
    endSessionCount++;
  },
};

const fakeConnection = {
  startSession: async () => fakeSession,
};
// Mock heartbeat timer for deterministic testing.
const fakeTimer = 123;

globalThis.setInterval = ((callback: () => Promise<void>) => {
  heartbeatCallback = callback;

  return fakeTimer as unknown as ReturnType<typeof setInterval>;
}) as typeof setInterval;

globalThis.clearInterval = (() => {
  heartbeatCallback = undefined;
}) as typeof clearInterval;

const transactionModel = {
  findOne: async (_query: { eventId: string }) => {
    findOneCalls++;
    return existingTransaction;
  },

  create: async (
    _documents: unknown[],
    _options: { session: unknown }
  ) => {
    createCalls++;
    return [fakeTransaction];
  },
};

const entryModel = {
  insertMany: async (
    _entries: unknown[],
    _options: { session: unknown }
  ) => {
    insertManyCalls++;

    if (insertManyError) {
      throw insertManyError;
    }

    if (triggerHeartbeatDuringTransaction && heartbeatCallback) {
      await heartbeatCallback();
    }

    return [];
  },
};

// Mock tenant database connection.
mock.module("../src/config/database.js", {
  namedExports: {
    getTenantConnection: async () => {
      connectionCalls++;
      return fakeConnection;
    },
  },
});

// Mock tenant-specific ledger models.
mock.module("../src/modules/ledger/ledger.model.js", {
  namedExports: {
    getLedgerModels: () => ({
      LedgerTransactionModel: transactionModel,
      LedgerEntryModel: entryModel,
    }),
  },
});

// Mock idempotency service.
mock.module("../src/modules/idempotency/idempotency.service.js", {
  namedExports: {
    acquireIdempotencyKey: async () => {
      if (idempotencyStatus === "acquired") {
        return {
          status: "acquired",
          token: "test-idempotency-token",
        };
      }

      return { status: idempotencyStatus };
    },

    completeIdempotencyKey: async () => {
      completeIdempotencyCalls++;
      return true;
    },

    recoverCompletedIdempotencyKey: async () => {
      recoverIdempotencyCalls++;
      return true;
    },

    releaseIdempotencyKey: async () => {
      releaseIdempotencyCalls++;
      return true;
    },
  },
});

// Mock distributed locking service.
mock.module("../src/modules/locking/locking.service.js", {
  namedExports: {
    acquireLock: async () => {
      acquireLockCalls++;

      if (lockAcquired) {
        return {
          acquired: true,
          token: "test-lock-token",
        };
      }

      return { acquired: false };
    },

    releaseLock: async () => {
      releaseLockCalls++;
      return true;
    },

   extendLock: async () => {
  extendLockCalls++;
  return extendLockResult;
},
  },
});

// Import service after configuring mocks.
const { createLedgerTransaction } = await import(
  "../src/modules/ledger/ledger.service.js"
);

function resetTestState(): void {
  connectionCalls = 0;
  createCalls = 0;
  findOneCalls = 0;
  insertManyCalls = 0;
  commitCount = 0;
  rollbackCount = 0;
  endSessionCount = 0;
  extendLockCalls = 0;

  completeIdempotencyCalls = 0;
  releaseIdempotencyCalls = 0;
  recoverIdempotencyCalls = 0;
  acquireLockCalls = 0;
  releaseLockCalls = 0;

  insertManyError = null;
  idempotencyStatus = "acquired";
  lockAcquired = true;
  existingTransaction = null;
  triggerHeartbeatDuringTransaction = false;
  extendLockResult = true;
  heartbeatCallback = undefined;
}

function validInput() {
  return {
    eventId: "event-101",
    transactionId: "TXN-101",
    currency: "INR",
    description: "Test ledger transaction",
    entries: [
      {
        accountId: "account-A",
        side: "debit" as const,
        amount: 10000,
      },
      {
        accountId: "account-B",
        side: "credit" as const,
        amount: 10000,
      },
    ],
  };
}

async function runTests(): Promise<void> {
  // Test 1: Valid balanced transaction.
  resetTestState();

  const result = await createLedgerTransaction(
    "company-A",
    validInput()
  );

  assert.equal(result, fakeTransaction);
  assert.equal(createCalls, 1);
  assert.equal(insertManyCalls, 1);
  assert.equal(commitCount, 1);
  assert.equal(rollbackCount, 0);
  assert.equal(endSessionCount, 1);
  assert.equal(completeIdempotencyCalls, 1);
  assert.equal(releaseLockCalls, 1);

  console.log("PASS: Valid balanced transaction is saved");

  // Test 2: Unbalanced debit and credit.
  resetTestState();

  const unbalancedInput = validInput();
  unbalancedInput.entries[1].amount = 5000;

  await assert.rejects(
    createLedgerTransaction("company-A", unbalancedInput),
    /Total debits and credits must be equal/
  );

  assert.equal(connectionCalls, 0);

  console.log("PASS: Unbalanced transaction is rejected");

  // Test 3: Invalid amount.
  resetTestState();

  const invalidAmountInput = validInput();
  invalidAmountInput.entries[0].amount = -100;

  await assert.rejects(
    createLedgerTransaction("company-A", invalidAmountInput),
    /Entry amount must be a positive safe integer/
  );

  console.log("PASS: Negative amount is rejected");

  // Test 4: Decimal amount.
  resetTestState();

  const decimalInput = validInput();
  decimalInput.entries[0].amount = 100.5;

  await assert.rejects(
    createLedgerTransaction("company-A", decimalInput),
    /Entry amount must be a positive safe integer/
  );

  console.log("PASS: Decimal amount is rejected");

  // Test 5: Missing event ID.
  resetTestState();

  const missingEventInput = validInput();
  missingEventInput.eventId = "";

  await assert.rejects(
    createLedgerTransaction("company-A", missingEventInput),
    /Event ID is required/
  );

  console.log("PASS: Missing event ID is rejected");

  // Test 6: Missing account ID.
  resetTestState();

  const missingAccountInput = validInput();
  missingAccountInput.entries[0].accountId = "";

  await assert.rejects(
    createLedgerTransaction("company-A", missingAccountInput),
    /Account ID is required/
  );

  console.log("PASS: Missing account ID is rejected");


  // Test 6A: Missing transaction ID.
  resetTestState();

  const missingTransactionInput = validInput();
  missingTransactionInput.transactionId = "   ";

  await assert.rejects(
    createLedgerTransaction("company-A", missingTransactionInput),
    /Transaction ID is required/
  );

  assert.equal(connectionCalls, 0);

  console.log("PASS: Missing transaction ID is rejected");

  // Test 6B: Invalid currency code.
  resetTestState();

  const invalidCurrencyInput = validInput();
  invalidCurrencyInput.currency = "US";

  await assert.rejects(
    createLedgerTransaction("company-A", invalidCurrencyInput),
    /A valid three-letter currency code is required/
  );

  assert.equal(connectionCalls, 0);

  console.log("PASS: Invalid currency code is rejected");

  // Test 6C: Unsafe integer amount.
  resetTestState();

  const unsafeAmountInput = validInput();
  unsafeAmountInput.entries[0].amount = Number.MAX_SAFE_INTEGER + 1;

  await assert.rejects(
    createLedgerTransaction("company-A", unsafeAmountInput),
    /Entry amount must be a positive safe integer/
  );

  assert.equal(connectionCalls, 0);

  console.log("PASS: Unsafe integer amount is rejected");

  // Test 6D: Invalid ledger entry side.
  resetTestState();

  const invalidSideInput = validInput();
  invalidSideInput.entries[0].side = "invalid" as "debit";

  await assert.rejects(
    createLedgerTransaction("company-A", invalidSideInput),
    /Invalid ledger entry side/
  );

  assert.equal(connectionCalls, 0);

  console.log("PASS: Invalid ledger entry side is rejected");


  // Test 7: Entry insertion failure triggers rollback.
  resetTestState();

  insertManyError = new Error("Simulated entry insertion failure");

  await assert.rejects(
    createLedgerTransaction("company-A", validInput()),
    /Simulated entry insertion failure/
  );

  assert.equal(createCalls, 1);
  assert.equal(insertManyCalls, 1);
  assert.equal(commitCount, 0);
  assert.equal(rollbackCount, 1);
  assert.equal(endSessionCount, 1);
  assert.equal(releaseIdempotencyCalls, 1);
  assert.equal(releaseLockCalls, 1);

  console.log("PASS: Failed entry insertion triggers rollback");

  // Test 8: Already completed event returns existing transaction.
  resetTestState();

  idempotencyStatus = "completed";
  existingTransaction = fakeTransaction;

  const completedResult = await createLedgerTransaction(
    "company-A",
    validInput()
  );

  assert.equal(completedResult, fakeTransaction);
  assert.equal(createCalls, 0);
  assert.equal(endSessionCount, 0);

  console.log("PASS: Completed event is not processed again");

  // Test 9: Processing event with existing MongoDB transaction.
  resetTestState();

  idempotencyStatus = "processing";
  existingTransaction = fakeTransaction;

  const recoveredResult = await createLedgerTransaction(
    "company-A",
    validInput()
  );

  assert.equal(recoveredResult, fakeTransaction);
  assert.equal(recoverIdempotencyCalls, 1);
  assert.equal(createCalls, 0);

  console.log("PASS: Existing transaction is recovered");

  // Test 10: New Redis key but transaction already exists.
  resetTestState();

  existingTransaction = fakeTransaction;

  const existingResult = await createLedgerTransaction(
    "company-A",
    validInput()
  );

  assert.equal(existingResult, fakeTransaction);
  assert.equal(completeIdempotencyCalls, 1);
  assert.equal(createCalls, 0);

  console.log("PASS: Existing MongoDB transaction is recovered after Redis key expiry");

  // Test 11: Lock conflict releases idempotency claim.
  resetTestState();

  lockAcquired = false;

  await assert.rejects(
    createLedgerTransaction("company-A", validInput()),
    /Another request is already processing this transaction/
  );

  assert.equal(releaseIdempotencyCalls, 1);
  assert.equal(createCalls, 0);
  assert.equal(endSessionCount, 0);

  console.log("PASS: Lock conflict releases idempotency claim");

// Test 12: Successful distributed lock heartbeat renewal.
  resetTestState();

  triggerHeartbeatDuringTransaction = true;

  await createLedgerTransaction(
    "company-A",
    validInput()
  );

  assert.equal(extendLockCalls, 1);
  assert.equal(commitCount, 1);
  assert.equal(rollbackCount, 0);
  assert.equal(releaseLockCalls, 1);
  assert.equal(heartbeatCallback, undefined);

  console.log("PASS: Distributed lock heartbeat renews successfully");

  // Test 13: Lost distributed lock aborts transaction.
  resetTestState();

  triggerHeartbeatDuringTransaction = true;
  extendLockResult = false;

  await assert.rejects(
    createLedgerTransaction(
      "company-A",
      validInput()
    ),
    /Distributed lock was lost during transaction/
  );

  assert.equal(extendLockCalls, 1);
  assert.equal(commitCount, 0);
  assert.equal(rollbackCount, 1);
  assert.equal(releaseLockCalls, 1);
  assert.equal(heartbeatCallback, undefined);

  console.log("PASS: Lost distributed lock aborts transaction");

  console.log("\nAll ledger service tests passed!");
}

void runTests().catch((error) => {
  console.error("Ledger service tests failed:", error);
  process.exitCode = 1;
});



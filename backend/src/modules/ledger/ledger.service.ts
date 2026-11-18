import type { Connection } from "mongoose";

import { getTenantConnection } from "../../config/database.js";

import {
  acquireIdempotencyKey,
  completeIdempotencyKey,
  recoverCompletedIdempotencyKey,
  releaseIdempotencyKey,
} from "../idempotency/idempotency.service.js";

import {
  acquireLock,
  releaseLock,
} from "../locking/locking.service.js";

import { getLedgerModels } from "./ledger.model.js";

import type {
  CreateLedgerTransactionInput,
  LedgerEntry,
} from "./ledger.types.js";

// Validate ledger transaction input.
function validateLedgerInput(
  input: CreateLedgerTransactionInput
): void {
  if (!input.eventId?.trim()) {
    throw new Error("Event ID is required");
  }

  if (!input.transactionId?.trim()) {
    throw new Error("Transaction ID is required");
  }

  if (!/^[A-Z]{3}$/i.test(input.currency)) {
    throw new Error("A valid three-letter currency code is required");
  }

  if (!Array.isArray(input.entries) || input.entries.length < 2) {
    throw new Error("At least two ledger entries are required");
  }

  for (const entry of input.entries) {
    if (!entry.accountId?.trim()) {
      throw new Error("Account ID is required");
    }

    if (!Number.isSafeInteger(entry.amount) || entry.amount <= 0) {
      throw new Error("Entry amount must be a positive safe integer");
    }

    if (entry.side !== "debit" && entry.side !== "credit") {
      throw new Error("Invalid ledger entry side");
    }
  }

  const totalDebits = input.entries
    .filter((entry) => entry.side === "debit")
    .reduce((total, entry) => total + entry.amount, 0);

  const totalCredits = input.entries
    .filter((entry) => entry.side === "credit")
    .reduce((total, entry) => total + entry.amount, 0);

  if (
    !Number.isSafeInteger(totalDebits) ||
    !Number.isSafeInteger(totalCredits)
  ) {
    throw new Error("Ledger totals exceed the safe integer range");
  }

  if (totalDebits === 0 || totalCredits === 0) {
    throw new Error("A transaction must contain debit and credit entries");
  }

  if (totalDebits !== totalCredits) {
    throw new Error("Total debits and credits must be equal");
  }
}

 // Create a ledger transaction atomically for a tenant.
export async function createLedgerTransaction(
  organizationId: string,
  input: CreateLedgerTransactionInput
) {
  validateLedgerInput(input);

  const connection: Connection =
    await getTenantConnection(organizationId);

  const {
    LedgerTransactionModel,
    LedgerEntryModel,
  } = getLedgerModels(connection);

  // Find and verify an existing transaction.
  const findExistingTransaction = async () => {
    const existingTransaction = await LedgerTransactionModel.findOne({
      eventId: input.eventId,
    });

    if (
      existingTransaction &&
      existingTransaction.transactionId !== input.transactionId
    ) {
      throw new Error(
        "Event ID is already associated with a different transaction"
      );
    }

    return existingTransaction;
  };

  // Acquire an idempotency key.
  const idempotencyResult = await acquireIdempotencyKey(
    organizationId,
    input.eventId
  );

  // Return an existing transaction if already completed.
  if (idempotencyResult.status === "completed") {
    const existingTransaction = await findExistingTransaction();

    if (!existingTransaction) {
      throw new Error(
        "Idempotency state is completed but transaction was not found"
      );
    }

    return existingTransaction;
  }

  // Recover a transaction committed before Redis completion.
  if (idempotencyResult.status === "processing") {
    const existingTransaction = await findExistingTransaction();

    if (existingTransaction) {
      await recoverCompletedIdempotencyKey(
        organizationId,
        input.eventId
      );

      return existingTransaction;
    }

    throw new Error("This event is already being processed");
  }

  // Check MongoDB even when a new Redis key was acquired.
  // This handles retries after an idempotency key expires.
  const existingTransaction = await findExistingTransaction();

  if (existingTransaction) {
    await completeIdempotencyKey(
      organizationId,
      input.eventId,
      idempotencyResult.token
    );

    return existingTransaction;
  }

  // Acquire a distributed lock.
  let lockResult;

  try {
    lockResult = await acquireLock(
      organizationId,
      input.transactionId
    );
  } catch (error) {
    try {
      await releaseIdempotencyKey(
        organizationId,
        input.eventId,
        idempotencyResult.token
      );
    } catch {
      // Preserve the original lock acquisition error.
    }

    throw error;
  }

  if (!lockResult.acquired) {
    await releaseIdempotencyKey(
      organizationId,
      input.eventId,
      idempotencyResult.token
    );

    throw new Error(
      "Another request is already processing this transaction"
    );
  }

  let session:
    | Awaited<ReturnType<Connection["startSession"]>>
    | undefined;

  let transactionCommitted = false;

  try {
    session = await connection.startSession();

    let createdTransaction:
      | InstanceType<typeof LedgerTransactionModel>
      | null = null;

    // Save transaction and entries atomically.
    await session.withTransaction(async () => {
      const [transaction] = await LedgerTransactionModel.create(
        [
          {
            eventId: input.eventId,
            transactionId: input.transactionId,
            currency: input.currency.toUpperCase(),
            description: input.description,
          },
        ],
        { session }
      );

      createdTransaction = transaction;

      const entries: LedgerEntry[] = input.entries.map((entry) => ({
        transactionId: input.transactionId,
        accountId: entry.accountId,
        side: entry.side,
        amount: entry.amount,
      }));

      await LedgerEntryModel.insertMany(entries, { session });
    });

    transactionCommitted = true;

    if (!createdTransaction) {
      throw new Error("Ledger transaction was not created");
    }

    // Mark the event as completed in Redis.
    await completeIdempotencyKey(
      organizationId,
      input.eventId,
      idempotencyResult.token
    );

    return createdTransaction;
  } catch (error) {
    // Release the idempotency claim only if MongoDB
    // has not committed the transaction.
    if (!transactionCommitted) {
      try {
        await releaseIdempotencyKey(
          organizationId,
          input.eventId,
          idempotencyResult.token
        );
      } catch {
        // Preserve the original transaction error.
      }
    }

    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }

    // Always attempt to release the distributed lock.
    try {
      await releaseLock(
        organizationId,
        input.transactionId,
        lockResult.token
      );
    } catch {
      // The lock will expire automatically after its TTL.
    }
  }
}

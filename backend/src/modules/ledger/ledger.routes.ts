
import { Router } from "express";

import { authenticateToken } from "../../middleware/auth.middleware.js";
import { resolveTenant } from "../../middleware/tenant.middleware.js";
import { attachTenantDatabase } from "../../middleware/tenant-db.middleware.js";

import {
  createLedgerTransaction,
  getLedgerTransactions,
} from "./ledger.service.js";

import type {
  CreateLedgerTransactionInput,
} from "./ledger.types.js";

const router = Router();

// Check whether a value is a valid object.
function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

// Validate the structure of the incoming request body.
function isCreateLedgerTransactionInput(
  value: unknown
): value is CreateLedgerTransactionInput {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.eventId !== "string" ||
    typeof value.transactionId !== "string" ||
    typeof value.currency !== "string" ||
    (value.description !== undefined &&
      typeof value.description !== "string") ||
    !Array.isArray(value.entries)
  ) {
    return false;
  }

  return value.entries.every((entry: unknown) => {
    if (!isRecord(entry)) {
      return false;
    }

    return (
      typeof entry.accountId === "string" &&
      (entry.side === "debit" || entry.side === "credit") &&
      typeof entry.amount === "number"
    );
  });
}

// Protect ledger endpoints with authentication and tenant isolation.
router.use(
  authenticateToken,
  resolveTenant,
  attachTenantDatabase
);


// Retrieve paginated ledger transactions for the authenticated tenant.
router.get("/", async (req, res) => {
  const organizationId = req.tenantId;

  if (!organizationId) {
    res.status(403).json({
      success: false,
      message: "Tenant context is required",
    });
    return;
  }

  const pageParam = req.query.page;
  const limitParam = req.query.limit;

  if (
    (pageParam !== undefined && typeof pageParam !== "string") ||
    (limitParam !== undefined && typeof limitParam !== "string")
  ) {
    res.status(400).json({
      success: false,
      message: "Page and limit must be valid numbers",
    });
    return;
  }

  const page = pageParam === undefined ? 1 : Number(pageParam);
  const limit = limitParam === undefined ? 10 : Number(limitParam);

  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    res.status(400).json({
      success: false,
      message: "Page must be positive and limit must be between 1 and 100",
    });
    return;
  }

  try {
    const result = await getLedgerTransactions(
      organizationId,
      page,
      limit
    );

    res.status(200).json({
      success: true,
      message: "Ledger transactions retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Get ledger transactions error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve ledger transactions",
    });
  }
});


// Create a ledger transaction for the authenticated tenant.
router.post("/", async (req, res) => {
  const organizationId = req.tenantId;

  if (!organizationId) {
    res.status(403).json({
      success: false,
      message: "Tenant context is required",
    });
    return;
  }

  if (!isCreateLedgerTransactionInput(req.body)) {
    res.status(400).json({
      success: false,
      message: "Invalid ledger transaction request body",
    });
    return;
  }

  try {
    const transaction = await createLedgerTransaction(
      organizationId,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Ledger transaction processed successfully",
      data: transaction,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    const validationErrors = [
      "Event ID is required",
      "Transaction ID is required",
      "A valid three-letter currency code is required",
      "At least two ledger entries are required",
      "Account ID is required",
      "Entry amount must be a positive safe integer",
      "Invalid ledger entry side",
      "Ledger totals exceed the safe integer range",
      "A transaction must contain debit and credit entries",
      "Total debits and credits must be equal",
    ];

    const conflictErrors = [
      "Event ID is already associated with a different transaction",
      "This event is already being processed",
      "Another request is already processing this transaction",
    ];

    if (validationErrors.includes(message)) {
      res.status(400).json({
        success: false,
        message,
      });
      return;
    }

    if (conflictErrors.includes(message)) {
      res.status(409).json({
        success: false,
        message,
      });
      return;
    }

    console.error("Ledger transaction error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to process ledger transaction",
    });
  }
});

export default router;

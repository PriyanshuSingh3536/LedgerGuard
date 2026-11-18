import { Schema } from "mongoose";

import type {
  LedgerEntry,
  LedgerTransaction,
} from "./ledger.types.js";

// Schema for the main ledger transaction.
export const ledgerTransactionSchema =
  new Schema<LedgerTransaction>(
    {
      eventId: {
        type: String,
        required: true,
        trim: true,
      },
      transactionId: {
        type: String,
        required: true,
        trim: true,
      },
      currency: {
        type: String,
        required: true,
        uppercase: true,
        match: /^[A-Z]{3}$/,
      },
      description: {
        type: String,
        trim: true,
        maxlength: 500,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

// Prevent duplicate events within a tenant database.
ledgerTransactionSchema.index(
  { eventId: 1 },
  { unique: true }
);

// Prevent duplicate transaction IDs.
ledgerTransactionSchema.index(
  { transactionId: 1 },
  { unique: true }
);

// Schema for individual debit/credit entries.
export const ledgerEntrySchema = new Schema<LedgerEntry>(
  {
    transactionId: {
      type: String,
      required: true,
      trim: true,
    },
    accountId: {
      type: String,
      required: true,
      trim: true,
    },
    side: {
      type: String,
      enum: ["debit", "credit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: "Ledger amount must be a safe integer",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index for retrieving entries by transaction.
ledgerEntrySchema.index({ transactionId: 1 });

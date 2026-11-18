import type { Connection, Model } from "mongoose";

import { getTenantModel } from "../../config/tenant-model.js";

import {
  ledgerEntrySchema,
  ledgerTransactionSchema,
} from "./ledger.schema.js";

import type {
  LedgerEntry,
  LedgerTransaction,
} from "./ledger.types.js";

// Register ledger models on the supplied tenant connection.
export function getLedgerModels(connection: Connection): {
  LedgerTransactionModel: Model<LedgerTransaction>;
  LedgerEntryModel: Model<LedgerEntry>;
} {
  const LedgerTransactionModel = getTenantModel<LedgerTransaction>(
    connection,
    "LedgerTransaction",
    ledgerTransactionSchema
  );

  const LedgerEntryModel = getTenantModel<LedgerEntry>(
    connection,
    "LedgerEntry",
    ledgerEntrySchema
  );

  return {
    LedgerTransactionModel,
    LedgerEntryModel,
  };
}


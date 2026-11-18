
import {
  getTenantConnection,
  closeTenantConnection,
} from "../src/config/database.js";

import { getLedgerModels } from "../src/modules/ledger/ledger.model.js";

const organizationId = "ledgerguard-atlas-integration-test";

async function verifyIndexes(): Promise<void> {
  const connection = await getTenantConnection(organizationId);

  try {
    const {
      LedgerTransactionModel,
      LedgerEntryModel,
    } = getLedgerModels(connection);

    await Promise.all([
      LedgerTransactionModel.init(),
      LedgerEntryModel.init(),
    ]);

    const indexes =
      await LedgerTransactionModel.collection.indexes();

    console.log("Tenant database:", connection.name);
    console.log("\nLedger transaction indexes:");

    for (const index of indexes) {
      console.log({
        name: index.name,
        key: index.key,
        unique: index.unique ?? false,
      });
    }

    const eventIdIndex = indexes.find(
      (index) =>
        index.key.eventId === 1 &&
        index.unique === true
    );

    const transactionIdIndex = indexes.find(
      (index) =>
        index.key.transactionId === 1 &&
        index.unique === true
    );

    if (!eventIdIndex || !transactionIdIndex) {
      throw new Error("Required unique indexes are missing");
    }

    console.log("\nPASS: Unique eventId index exists");
    console.log("PASS: Unique transactionId index exists");
  } finally {
    await closeTenantConnection(organizationId);
  }
}

verifyIndexes().catch((error: unknown) => {
  console.error(
    "Index verification failed:",
    error instanceof Error ? error.message : error
  );

  process.exitCode = 1;
});

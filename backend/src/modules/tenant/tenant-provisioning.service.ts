
import type { Connection } from "mongoose";

import {
  getTenantConnection,
  getTenantDatabaseName,
} from "../../config/database.js";

import { getLedgerModels } from "../ledger/ledger.model.js";

// Handle an already-existing MongoDB collection.
function isNamespaceExistsError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 48
  );
}

// Create a collection only if it does not already exist.
async function ensureCollectionExists(
  connection: Connection,
  collectionName: string
): Promise<void> {
  if (!connection.db) {
    throw new Error("Tenant database is unavailable");
  }

  const collectionExists = await connection.db
    .listCollections(
      { name: collectionName },
      { nameOnly: true }
    )
    .hasNext();

  if (collectionExists) {
    return;
  }

  try {
    await connection.createCollection(collectionName);
  } catch (error) {
    // Another provisioning request may have created it first.
    if (!isNamespaceExistsError(error)) {
      throw error;
    }
  }
}

// Provision the initial collections and indexes for a tenant.
export async function provisionTenantDatabase(
  organizationId: string
): Promise<{
  databaseName: string;
  connection: Connection;
}> {
  if (!organizationId.trim()) {
    throw new Error("Organization ID is required");
  }

  // Get the isolated database connection for this organization.
  const connection = await getTenantConnection(organizationId);

  // Register existing ledger models on this tenant connection.
  const {
    LedgerTransactionModel,
    LedgerEntryModel,
  } = getLedgerModels(connection);

  // Create the initial tenant collections.
  await ensureCollectionExists(
    connection,
    LedgerTransactionModel.collection.collectionName
  );

  await ensureCollectionExists(
    connection,
    LedgerEntryModel.collection.collectionName
  );

  // Create the indexes defined in the ledger schemas.
  await LedgerTransactionModel.createIndexes();
  await LedgerEntryModel.createIndexes();

  return {
    databaseName: getTenantDatabaseName(organizationId),
    connection,
  };
}

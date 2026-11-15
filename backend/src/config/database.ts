
import mongoose, { type Connection } from "mongoose";
import { createHash } from "node:crypto";

import { env } from "./env.js";

// Store active tenant connection promises.
const tenantConnections = new Map<string, Promise<Connection>>();

// Generate a safe and deterministic database name.
export function getTenantDatabaseName(
  organizationId: string
): string {
  const normalizedId = organizationId.trim();

  if (!normalizedId) {
    throw new Error("Organization ID is required");
  }

  const tenantHash = createHash("sha256")
    .update(normalizedId)
    .digest("hex")
    .slice(0, 24);

  return `${env.MONGODB_DB_PREFIX}_tenant_${tenantHash}`;
}

// Get or create a tenant-specific database connection.
export async function getTenantConnection(
  organizationId: string
): Promise<Connection> {
  const databaseName = getTenantDatabaseName(organizationId);

  const existingConnection = tenantConnections.get(databaseName);

  if (existingConnection) {
    return existingConnection;
  }

  const connection = mongoose.createConnection(env.MONGODB_URI, {
    dbName: databaseName,
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5000,
  });

  const connectionPromise = connection.asPromise().catch(
  async (error: unknown) => {
    // Remove only this failed connection entry.
    if (tenantConnections.get(databaseName) === connectionPromise) {
      tenantConnections.delete(databaseName);
    }

    // Clean up the failed connection.
    await connection.close().catch(() => undefined);

    throw error;
  }
);

  tenantConnections.set(databaseName, connectionPromise);

  return connectionPromise;
}

// Close a specific tenant connection.
export async function closeTenantConnection(
  organizationId: string
): Promise<void> {
  const databaseName = getTenantDatabaseName(organizationId);
  const connectionPromise = tenantConnections.get(databaseName);

  if (!connectionPromise) {
    return;
  }

  tenantConnections.delete(databaseName);

  const connection = await connectionPromise;
  await connection.close();
}

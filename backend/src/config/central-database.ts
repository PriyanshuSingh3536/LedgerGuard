
import mongoose, { type Connection } from "mongoose";
import { env } from "./env.js";

let centralConnectionPromise: Promise<Connection> | null = null;

// Connect to the central authentication database.
export async function connectCentralDatabase(): Promise<Connection> {
  if (centralConnectionPromise) {
    const existingConnection = await centralConnectionPromise;

    if (existingConnection.readyState === 1) {
      return existingConnection;
    }

    centralConnectionPromise = null;
  }

  const connection = mongoose.createConnection(env.MONGODB_URI, {
    dbName: "ledgerguard_central",
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5000,
  });

  centralConnectionPromise = connection.asPromise().catch(async (error: unknown) => {
    centralConnectionPromise = null;
    await connection.close().catch(() => undefined);
    throw error;
  });

  return centralConnectionPromise;
}

// Close the central database connection.
export async function disconnectCentralDatabase(): Promise<void> {
  if (!centralConnectionPromise) return;

  const connection = await centralConnectionPromise;
  centralConnectionPromise = null;

  await connection.close();
}

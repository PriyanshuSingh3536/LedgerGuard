
import type { Connection, Model, Schema } from "mongoose";

// Get or create a model on the specific tenant connection.
export function getTenantModel<T>(
  connection: Connection,
  modelName: string,
  schema: Schema<T>
): Model<T> {
  // Reuse the model if it already exists on this connection.
  const existingModel = connection.models[modelName] as
    | Model<T>
    | undefined;

  if (existingModel) {
    return existingModel;
  }

  // Create the model on this tenant's connection.
  return connection.model<T>(modelName, schema);
}

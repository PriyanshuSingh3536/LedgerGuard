
import { Schema, type Connection, type Model } from "mongoose";

export interface UserDocument {
  userId: string;
  email: string;
  passwordHash: string;
  organizationId: string;
  role: "admin" | "accountant" | "viewer";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    organizationId: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "accountant", "viewer"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Email must be unique within an organization.
userSchema.index(
  { organizationId: 1, email: 1 },
  { unique: true }
);

export function getUserModel(connection: Connection): Model<UserDocument> {
  return (
    (connection.models.User as Model<UserDocument> | undefined) ??
    connection.model<UserDocument>("User", userSchema)
  );
}


import { Schema, type Connection, type Model } from "mongoose";

export type OrganizationProvisioningStatus =
  | "pending"
  | "active"
  | "failed";

export interface OrganizationDocument {
  organizationId: string;
  name: string;
  email: string;
  isActive: boolean;
  provisioningStatus: OrganizationProvisioningStatus;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<OrganizationDocument>(
  {
    organizationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    provisioningStatus: {
      type: String,
      enum: ["pending", "active", "failed"],
      default: "pending",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

organizationSchema.index({ email: 1 });

export function getOrganizationModel(
  connection: Connection
): Model<OrganizationDocument> {
  return (
    (connection.models.Organization as
      | Model<OrganizationDocument>
      | undefined) ??
    connection.model<OrganizationDocument>(
      "Organization",
      organizationSchema
    )
  );
}

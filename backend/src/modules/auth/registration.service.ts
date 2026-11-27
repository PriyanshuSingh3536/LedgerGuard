
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

import { connectCentralDatabase } from "../../config/central-database.js";
import { provisionTenantDatabase } from "../tenant/tenant-provisioning.service.js";

import { getOrganizationModel } from "./models/organization.model.js";
import { getUserModel } from "./models/user.model.js";

interface RegisterOrganizationInput {
  organizationName: string;
  organizationEmail: string;
  adminEmail: string;
  adminPassword: string;
}

export async function registerOrganization(
  input: RegisterOrganizationInput
) {
  const organizationName = input.organizationName.trim();
  const organizationEmail = input.organizationEmail.trim().toLowerCase();
  const adminEmail = input.adminEmail.trim().toLowerCase();
  const adminPassword = input.adminPassword;

  if (
    !organizationName ||
    !organizationEmail ||
    !adminEmail ||
    !adminPassword
  ) {
    throw new Error("All registration fields are required");
  }

  if (adminPassword.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  const connection = await connectCentralDatabase();

  const Organization = getOrganizationModel(connection);
  const User = getUserModel(connection);

  const organizationId = randomUUID();
  const userId = randomUUID();

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const session = await connection.startSession();

  // Step 1: Create organization and admin in central database.
  try {
    await session.withTransaction(async () => {
      await Organization.create(
        [
          {
            organizationId,
            name: organizationName,
            email: organizationEmail,
            isActive: false,
            provisioningStatus: "pending",
          },
        ],
        { session }
      );

      await User.create(
        [
          {
            userId,
            email: adminEmail,
            passwordHash,
            organizationId,
            role: "admin",
            isActive: true,
          },
        ],
        { session }
      );
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new Error(
        "Organization or admin account already exists"
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }

  // Step 2: Provision the separate tenant database.
  try {
    const tenant = await provisionTenantDatabase(organizationId);

    // Step 3: Activate organization only after provisioning succeeds.
    const activationResult = await Organization.updateOne(
      {
        organizationId,
        provisioningStatus: "pending",
      },
      {
        $set: {
          isActive: true,
          provisioningStatus: "active",
        },
      }
    );

    if (activationResult.matchedCount !== 1) {
      throw new Error("Organization activation failed");
    }

    return {
      organization: {
        organizationId,
        name: organizationName,
        email: organizationEmail,
        provisioningStatus: "active",
      },
      admin: {
        userId,
        email: adminEmail,
        role: "admin",
      },
      tenant: {
        databaseName: tenant.databaseName,
        provisioned: true,
      },
    };
  } catch (error) {
    // Keep the organization inactive if provisioning fails.
    await Organization.updateOne(
      { organizationId },
      {
        $set: {
          isActive: false,
          provisioningStatus: "failed",
        },
      }
    ).catch(() => undefined);

    throw new Error(
      "Organization registration was saved, but tenant provisioning failed"
    );
  }
}


import bcrypt from "bcryptjs";

import { connectCentralDatabase } from "../../config/central-database.js";
import { getOrganizationModel } from "./models/organization.model.js";
import { getUserModel } from "./models/user.model.js";
import { signToken } from "./jwt.service.js";

interface LoginInput {
  organizationId: string;
  email: string;
  password: string;
}

export async function loginUser(input: LoginInput) {
  const organizationId = input.organizationId.trim();
  const email = input.email.trim().toLowerCase();

  if (!organizationId || !email || !input.password) {
    throw new Error(
      "Organization ID, email and password are required"
    );
  }

  // Connect to the central authentication database.
  const connection = await connectCentralDatabase();

  const Organization = getOrganizationModel(connection);
  const User = getUserModel(connection);

  // Verify that the organization exists and is fully provisioned.
  const organization = await Organization.findOne({
    organizationId,
  });

  if (
    !organization ||
    !organization.isActive ||
    organization.provisioningStatus !== "active"
  ) {
    throw new Error("Organization is inactive or not provisioned");
  }

  // Find the user within the requested organization.
  const user = await User.findOne({
    organizationId,
    email,
  }).select("+passwordHash");

  if (!user) {
    throw new Error("Invalid organization ID, email or password");
  }

  if (!user.isActive) {
    throw new Error("User account is inactive");
  }

  // Verify the submitted password against its stored hash.
  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new Error("Invalid organization ID, email or password");
  }

  // Generate the existing RS256 JWT.
  const token = signToken({
    userId: user.userId,
    organizationId: user.organizationId,
    role: user.role,
  });

  return {
    token,
    user: {
      userId: user.userId,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    },
  };
}

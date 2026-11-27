
import { Router } from "express";

import { authenticateToken } from "../../middleware/auth.middleware.js";
import { loginUser } from "./auth.service.js";
import { registerOrganization } from "./registration.service.js";

const router = Router();

// Register a new organization and its first admin.
router.post("/register", async (req, res) => {
  try {
    const {
      organizationName,
      organizationEmail,
      adminEmail,
      adminPassword,
    } = req.body ?? {};

    if (
      typeof organizationName !== "string" ||
      typeof organizationEmail !== "string" ||
      typeof adminEmail !== "string" ||
      typeof adminPassword !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "All registration fields are required",
      });
    }

    const result = await registerOrganization({
      organizationName,
      organizationEmail,
      adminEmail,
      adminPassword,
    });

    return res.status(201).json({
      success: true,
      message: "Organization registered successfully",
      data: result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Registration failed";

    if (message.includes("required") || message.includes("8 characters")) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    if (message.includes("already exists")) {
      return res.status(409).json({
        success: false,
        message,
      });
    }

    if (
      message ===
      "Organization registration was saved, but tenant provisioning failed"
    ) {
      console.error("Tenant provisioning failed:", error);

      return res.status(503).json({
        success: false,
        message:
          "Organization registration was saved, but tenant provisioning failed. Please contact support for provisioning recovery.",
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Login using organization ID, email and password.
router.post("/login", async (req, res) => {
  try {
    const { organizationId, email, password } = req.body ?? {};

    if (
      typeof organizationId !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Organization ID, email and password are required",
      });
    }

    const result = await loginUser({
      organizationId,
      email,
      password,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Login failed";

    if (
      message === "User account is inactive" ||
      message === "Organization is inactive or not provisioned"
    ) {
      return res.status(403).json({
        success: false,
        message,
      });
    }

    if (message.includes("Invalid") || message.includes("required")) {
      return res.status(401).json({
        success: false,
        message: "Invalid organization ID, email or password",
      });
    }

    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get authenticated user's identity.
router.get("/me", authenticateToken, (req, res) => {
  const auth = req.auth;

  if (!auth) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      userId: auth.userId,
      organizationId: auth.organizationId,
      role: auth.role,
    },
  });
});

export default router;


import { Router } from "express";

import { authenticateToken } from "../../middleware/auth.middleware.js";
import { resolveTenant } from "../../middleware/tenant.middleware.js";
import { attachTenantDatabase } from "../../middleware/tenant-db.middleware.js";

const router = Router();

// Protect every route with authentication and tenant database resolution.
router.use(
  authenticateToken,
  resolveTenant,
  attachTenantDatabase
);

// Verify that the authenticated tenant database is connected.
router.get("/health", (req, res) => {
  if (!req.tenantId || !req.tenantConnection) {
    return res.status(503).json({
      success: false,
      message: "Tenant database connection is unavailable",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Tenant database connected successfully",
  });
});

export default router;
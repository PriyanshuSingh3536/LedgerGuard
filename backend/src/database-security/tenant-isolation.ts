
import type { RequestHandler } from "express";

// Check whether the requested resource belongs to the user's tenant.
export const verifyTenantIsolation: RequestHandler = (
  req,
  res,
  next
) => {
  // Authentication must be completed first.
  if (!req.auth || !req.tenantId) {
    res.status(401).json({
      success: false,
      message: "Authentication and tenant context required",
    });
    return;
  }

  // Get the tenant ID from the requested resource.
  const resourceTenantId = req.params.organizationId;

  // Block access if the resource tenant is missing.
  if (!resourceTenantId) {
    res.status(400).json({
      success: false,
      message: "Resource organization ID is required",
    });
    return;
  }

  // Prevent cross-tenant access.
  if (resourceTenantId !== req.tenantId) {
    res.status(403).json({
      success: false,
      message: "Cross-tenant access denied",
    });
    return;
  }

  next();
};

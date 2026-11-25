
import mongoose from "mongoose";
import type { RequestHandler } from "express";

// Validate the tenant context and database connection.
export const validateTenantDatabase: RequestHandler = (
  req,
  res,
  next
) => {
  // Check whether the user is authenticated.
  if (!req.auth || !req.tenantId) {
    res.status(401).json({
      success: false,
      message: "Authentication and tenant context required",
    });
    return;
  }

  // Check whether the tenant database connection exists.
  if (!req.tenantConnection) {
    res.status(503).json({
      success: false,
      message: "Tenant database connection unavailable",
    });
    return;
  }

  // Ensure the tenant database connection is active.
  if (req.tenantConnection.readyState !== 1) {
    res.status(503).json({
      success: false,
      message: "Tenant database connection is not active",
    });
    return;
  }

  next();
};

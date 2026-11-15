
import type { Connection } from "mongoose";
import type { RequestHandler } from "express";

import { getTenantConnection } from "../config/database.js";

// Attach the tenant's database connection to the request.
declare global {
  namespace Express {
    interface Request {
      tenantConnection?: Connection;
    }
  }
}

export const attachTenantDatabase: RequestHandler = async (
  req,
  res,
  next
) => {
  // Tenant context must be resolved before database selection.
  if (!req.tenantId) {
    res.status(403).json({
      success: false,
      message: "Tenant context is required",
    });
    return;
  }

  try {
    // Get or create the database connection for this organization.
    const connection = await getTenantConnection(req.tenantId);

    req.tenantConnection = connection;

    next();
  } catch {
    res.status(503).json({
      success: false,
      message: "Tenant database is currently unavailable",
    });
  }
};

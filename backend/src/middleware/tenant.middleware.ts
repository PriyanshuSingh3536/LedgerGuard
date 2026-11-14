import type { RequestHandler } from "express";

// Attach tenant identity to Express requests.
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

// Resolve the tenant from the verified JWT.
export const resolveTenant: RequestHandler = (
  req,
  res,
  next
) => {
  // Authentication must run before tenant resolution.
  if (!req.auth) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  const organizationId = req.auth.organizationId;

  // Ensure the authenticated user has a valid organization ID.
  if (
    typeof organizationId !== "string" ||
    organizationId.trim().length === 0
  ) {
    res.status(403).json({
      success: false,
      message: "Valid organization context is required",
    });
    return;
  }

  // Attach the verified organization ID to the request.
  req.tenantId = organizationId;

  next();
};

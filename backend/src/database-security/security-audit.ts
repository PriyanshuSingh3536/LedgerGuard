
export type SecurityEventType =
  | "UNAUTHORIZED_ACCESS"
  | "CROSS_TENANT_ACCESS"
  | "DATABASE_CONNECTION_FAILURE";

export interface SecurityAuditEvent {
  eventType: SecurityEventType;
  organizationId?: string;
  userId?: string;
  message: string;
  timestamp: string;
}

// Record a security event.
export function createSecurityAuditEvent(
  eventType: SecurityEventType,
  message: string,
  organizationId?: string,
  userId?: string
): SecurityAuditEvent {
  const event: SecurityAuditEvent = {
    eventType,
    message,
    timestamp: new Date().toISOString(),
  };

  if (organizationId) {
    event.organizationId = organizationId;
  }

  if (userId) {
    event.userId = userId;
  }

  // Log the security event.
  console.warn("[SECURITY AUDIT]", JSON.stringify(event));

  return event;
}


import assert from "node:assert/strict";

import {
  createSecurityAuditEvent,
} from "../src/database-security/security-audit.js";

// Test 1: Security event type.
{
  const event = createSecurityAuditEvent(
    "UNAUTHORIZED_ACCESS",
    "Unauthorized access attempt"
  );

  assert.equal(event.eventType, "UNAUTHORIZED_ACCESS");
  console.log("PASS: Security event type recorded");
}

// Test 2: Organization ID recorded.
{
  const event = createSecurityAuditEvent(
    "CROSS_TENANT_ACCESS",
    "Cross-tenant access blocked",
    "org-123"
  );

  assert.equal(event.organizationId, "org-123");
  console.log("PASS: Organization ID recorded");
}

// Test 3: User ID recorded.
{
  const event = createSecurityAuditEvent(
    "UNAUTHORIZED_ACCESS",
    "Invalid access attempt",
    "org-123",
    "user-456"
  );

  assert.equal(event.userId, "user-456");
  console.log("PASS: User ID recorded");
}

// Test 4: Timestamp generated.
{
  const event = createSecurityAuditEvent(
    "DATABASE_CONNECTION_FAILURE",
    "Database connection failed"
  );

  assert.ok(!Number.isNaN(Date.parse(event.timestamp)));
  console.log("PASS: Valid timestamp generated");
}

// Test 5: Event message recorded.
{
  const event = createSecurityAuditEvent(
    "CROSS_TENANT_ACCESS",
    "Access denied"
  );

  assert.equal(event.message, "Access denied");
  console.log("PASS: Security event message recorded");
}

console.log("All security audit tests passed!");

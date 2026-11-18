
import { randomUUID } from "node:crypto";

import { redisClient } from "../../config/redis.js";

const LOCK_TTL_MS = 30_000;

export type LockResult =
  | {
      acquired: true;
      token: string;
    }
  | {
      acquired: false;
    };

// Release a lock only when the current request owns it.
const RELEASE_LOCK_SCRIPT = `
  local current = redis.call("GET", KEYS[1])

  if current == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  end

  return 0
`;

// Extend a lock only when the current request owns it.
const EXTEND_LOCK_SCRIPT = `
  local current = redis.call("GET", KEYS[1])

  if current == ARGV[1] then
    return redis.call("PEXPIRE", KEYS[1], ARGV[2])
  end

  return 0
`;

// Generate a tenant-specific Redis lock key.
function getLockRedisKey(
  tenantId: string,
  resourceId: string
): string {
  if (!tenantId.trim() || !resourceId.trim()) {
    throw new Error("Tenant ID and resource ID are required");
  }

  return `ledgerguard:lock:${encodeURIComponent(
    tenantId
  )}:${encodeURIComponent(resourceId)}`;
}

// Acquire a distributed lock.
export async function acquireLock(
  tenantId: string,
  resourceId: string
): Promise<LockResult> {
  const key = getLockRedisKey(tenantId, resourceId);
  const token = randomUUID();

  const result = await redisClient.set(
    key,
    token,
    "PX",
    LOCK_TTL_MS,
    "NX"
  );

  if (result === "OK") {
    return {
      acquired: true,
      token,
    };
  }

  return {
    acquired: false,
  };
}

// Release a lock owned by the current request.
export async function releaseLock(
  tenantId: string,
  resourceId: string,
  token: string
): Promise<boolean> {
  const key = getLockRedisKey(tenantId, resourceId);

  const result = await redisClient.eval(
    RELEASE_LOCK_SCRIPT,
    1,
    key,
    token
  );

  return result === 1;
}

// Extend an existing lock.
export async function extendLock(
  tenantId: string,
  resourceId: string,
  token: string
): Promise<boolean> {
  const key = getLockRedisKey(tenantId, resourceId);

  const result = await redisClient.eval(
    EXTEND_LOCK_SCRIPT,
    1,
    key,
    token,
    LOCK_TTL_MS.toString()
  );

  return result === 1;
}

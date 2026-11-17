
import { randomUUID } from "node:crypto";

import { redisClient } from "../../config/redis.js";

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

export type IdempotencyResult =
  | {
      status: "acquired";
      token: string;
    }
  | {
      status: "processing";
    }
  | {
      status: "completed";
    };

// Atomically mark an event as completed only if
// the current request owns its processing token.
const COMPLETE_SCRIPT = `
  local current = redis.call("GET", KEYS[1])

  if current == ARGV[1] then
    redis.call("SET", KEYS[1], "completed", "EX", ARGV[2])
    return 1
  end

  return 0
`;

// Release a processing key only if the current
// request owns its token.
const RELEASE_SCRIPT = `
  local current = redis.call("GET", KEYS[1])

  if current == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  end

  return 0
`;

function getIdempotencyRedisKey(
  tenantId: string,
  idempotencyKey: string
): string {
  if (!tenantId.trim() || !idempotencyKey.trim()) {
    throw new Error("Tenant ID and idempotency key are required");
  }

  return `ledgerguard:idempotency:${encodeURIComponent(
    tenantId
  )}:${encodeURIComponent(idempotencyKey)}`;
}

// Claim an event for processing.
export async function acquireIdempotencyKey(
  tenantId: string,
  idempotencyKey: string
): Promise<IdempotencyResult> {
  const key = getIdempotencyRedisKey(tenantId, idempotencyKey);
  const token = randomUUID();
  const processingValue = `processing:${token}`;

  const result = await redisClient.set(
    key,
    processingValue,
    "EX",
    IDEMPOTENCY_TTL_SECONDS,
    "NX"
  );

  if (result === "OK") {
    return {
      status: "acquired",
      token,
    };
  }

  const existingValue = await redisClient.get(key);

  if (existingValue === "completed") {
    return { status: "completed" };
  }

  return { status: "processing" };
}

// Mark an event as completed.
export async function completeIdempotencyKey(
  tenantId: string,
  idempotencyKey: string,
  token: string
): Promise<boolean> {
  const key = getIdempotencyRedisKey(tenantId, idempotencyKey);

  const result = await redisClient.eval(
    COMPLETE_SCRIPT,
    1,
    key,
    `processing:${token}`,
    IDEMPOTENCY_TTL_SECONDS.toString()
  );

  return result === 1;
}

// Release a processing key after failure.
export async function releaseIdempotencyKey(
  tenantId: string,
  idempotencyKey: string,
  token: string
): Promise<boolean> {
  const key = getIdempotencyRedisKey(tenantId, idempotencyKey);

  const result = await redisClient.eval(
    RELEASE_SCRIPT,
    1,
    key,
    `processing:${token}`
  );

  return result === 1;
}

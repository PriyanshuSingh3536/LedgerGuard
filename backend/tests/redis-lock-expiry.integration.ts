import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { redisClient } from "../src/config/redis.js";
import {
  acquireLock,
  releaseLock,
} from "../src/modules/locking/locking.service.js";

const tenantId = `lock-expiry-test-${randomUUID()}`;
const resourceId = `resource-${randomUUID()}`;

async function runTest() {
  let secondToken: string | undefined;

  try {
    const firstLock = await acquireLock(tenantId, resourceId);

    assert.equal(firstLock.acquired, true);
    if (!firstLock.acquired) throw new Error("First lock was not acquired");

    console.log("PASS: First lock acquired");

    const ttl = await redisClient.pttl(
      `ledgerguard:lock:${encodeURIComponent(tenantId)}:${encodeURIComponent(resourceId)}`
    );

    assert.ok(ttl > 0 && ttl <= 30_000);
    console.log(`PASS: Redis lock TTL is ${ttl} ms`);

    await new Promise((resolve) => setTimeout(resolve, 31_000));

    const secondLock = await acquireLock(tenantId, resourceId);

    assert.equal(secondLock.acquired, true);
    if (!secondLock.acquired) throw new Error("Lock did not expire");

    secondToken = secondLock.token;
    console.log("PASS: Second lock acquired after expiry");

    const oldOwnerRelease = await releaseLock(
      tenantId,
      resourceId,
      firstLock.token
    );

    assert.equal(oldOwnerRelease, false);
    console.log("PASS: Expired lock owner cannot release the new lock");

    const newOwnerRelease = await releaseLock(
      tenantId,
      resourceId,
      secondToken
    );

    assert.equal(newOwnerRelease, true);
    secondToken = undefined;
    console.log("PASS: New lock owner released the lock");

    console.log("\nRedis lock expiry integration: VERIFIED");
  } finally {
    if (secondToken) {
      await releaseLock(tenantId, resourceId, secondToken);
    }
    if (redisClient.status === "ready") {
      await redisClient.quit();
    }
  }
}

runTest().catch((error) => {
  console.error("FAIL:", error);
  process.exitCode = 1;
});

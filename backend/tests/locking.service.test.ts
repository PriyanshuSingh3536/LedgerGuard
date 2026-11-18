
import assert from "node:assert/strict";
import { mock } from "node:test";

const redisMock = {
  set: mock.fn(
    async (..._args: any[]): Promise<string | null> => "OK"
  ),

  eval: mock.fn(
    async (..._args: any[]): Promise<number> => 1
  ),
};

mock.module("../src/config/redis.js", {
  namedExports: {
    redisClient: redisMock,
  },
});

const {
  acquireLock,
  releaseLock,
  extendLock,
} = await import("../src/modules/locking/locking.service.js");

async function runTests(): Promise<void> {
  // Test 1: First request acquires the lock.
  redisMock.set.mock.mockImplementation(async () => "OK");

  const firstLock = await acquireLock("company-A", "account-101");

  assert.equal(firstLock.acquired, true);

  if (!firstLock.acquired) {
    throw new Error("Expected lock to be acquired");
  }

  console.log("PASS: First request acquires the lock");

  // Test 2: Second request cannot acquire an existing lock.
  redisMock.set.mock.mockImplementation(async () => null);

  const secondLock = await acquireLock("company-A", "account-101");

  assert.equal(secondLock.acquired, false);

  console.log("PASS: Existing lock prevents another request");

  // Test 3: Lock can be released by its owner.
  redisMock.eval.mock.mockImplementation(async () => 1);

  const released = await releaseLock(
    "company-A",
    "account-101",
    firstLock.token
  );

  assert.equal(released, true);

  console.log("PASS: Lock can be released by its owner");

  // Test 4: Wrong token cannot release the lock.
  redisMock.eval.mock.mockImplementation(async () => 0);

  const wrongTokenRelease = await releaseLock(
    "company-A",
    "account-101",
    "wrong-token"
  );

  assert.equal(wrongTokenRelease, false);

  console.log("PASS: Wrong token cannot release the lock");

  // Test 5: Lock can be extended by its owner.
  redisMock.eval.mock.mockImplementation(async () => 1);

  const extended = await extendLock(
    "company-A",
    "account-101",
    firstLock.token
  );

  assert.equal(extended, true);

  console.log("PASS: Lock can be extended by its owner");

  // Test 6: Wrong token cannot extend the lock.
  redisMock.eval.mock.mockImplementation(async () => 0);

  const wrongTokenExtension = await extendLock(
    "company-A",
    "account-101",
    "wrong-token"
  );

  assert.equal(wrongTokenExtension, false);

  console.log("PASS: Wrong token cannot extend the lock");

  // Test 7: Different tenants use different lock keys.
  const generatedKeys: string[] = [];

  redisMock.set.mock.mockImplementation(async (...args: any[]) => {
    generatedKeys.push(String(args[0]));
    return "OK";
  });

  await acquireLock("company-A", "account-101");
  await acquireLock("company-B", "account-101");

  assert.notEqual(generatedKeys[0], generatedKeys[1]);

  console.log("PASS: Different tenants receive separate lock keys");

  // Test 8: Empty tenant ID is rejected.
  await assert.rejects(
    acquireLock("", "account-101"),
    /Tenant ID and resource ID are required/
  );

  console.log("PASS: Empty tenant ID is rejected");

  console.log("\nAll locking service tests passed!");
}

void runTests();

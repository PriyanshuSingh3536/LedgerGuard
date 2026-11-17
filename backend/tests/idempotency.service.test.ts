
import assert from "node:assert/strict";
import { mock } from "node:test";
import { randomUUID } from "node:crypto";

// Fake Redis client for unit testing.
const redisMock = {
  set: mock.fn(
    async (..._args: any[]): Promise<string | null> => "OK"
  ),

  get: mock.fn(
    async (..._args: any[]): Promise<string | null> => null
  ),

  eval: mock.fn(
    async (..._args: any[]): Promise<number> => 1
  ),
};

// Mock Redis configuration before importing the service.
mock.module("../src/config/redis.js", {
  namedExports: {
    redisClient: redisMock,
  },
});

// Import service after setting up the mock.
const {
  acquireIdempotencyKey,
  completeIdempotencyKey,
  releaseIdempotencyKey,
} = await import("../src/modules/idempotency/idempotency.service.js");

async function runTests(): Promise<void> {
  // Test 1: First request acquires the key.
  redisMock.set.mock.mockImplementation(async () => "OK");

  const firstRequest = await acquireIdempotencyKey(
    "company-A",
    "event-101"
  );

  assert.equal(firstRequest.status, "acquired");

  if (firstRequest.status !== "acquired") {
    throw new Error("Expected an acquired result");
  }

  console.log("PASS: First request acquires the idempotency key");

  // Test 2: Duplicate request is identified as processing.
  redisMock.set.mock.mockImplementation(async () => null);
  redisMock.get.mock.mockImplementation(
    async () => "processing:another-token"
  );

  const duplicateRequest = await acquireIdempotencyKey(
    "company-A",
    "event-101"
  );

  assert.equal(duplicateRequest.status, "processing");

  console.log("PASS: Duplicate processing request is identified");

  // Test 3: Completed event is identified.
  redisMock.get.mock.mockImplementation(async () => "completed");

  const completedRequest = await acquireIdempotencyKey(
    "company-A",
    "event-101"
  );

  assert.equal(completedRequest.status, "completed");

  console.log("PASS: Completed event is identified as duplicate");

  // Test 4: Event can be marked completed.
  redisMock.eval.mock.mockImplementation(async () => 1);

  const completed = await completeIdempotencyKey(
    "company-A",
    "event-101",
    firstRequest.token
  );

  assert.equal(completed, true);

  console.log("PASS: Processing event can be marked completed");

  // Test 5: Processing lock can be released.
  const released = await releaseIdempotencyKey(
    "company-A",
    "event-101",
    firstRequest.token
  );

  assert.equal(released, true);

  console.log("PASS: Processing lock can be released");


    // Test 6: Wrong token cannot complete another request's event.
    redisMock.eval.mock.mockImplementation(async () => 0);

    const wrongTokenCompletion = await completeIdempotencyKey(
      "company-A",
      "event-101",
      randomUUID()
    );

    assert.equal(wrongTokenCompletion, false);

    console.log("PASS: Wrong token cannot complete another request's event");

    // Test 7: Wrong token cannot release another request's lock.
    const wrongTokenRelease = await releaseIdempotencyKey(
      "company-A",
      "event-101",
      randomUUID()
    );

    assert.equal(wrongTokenRelease, false);

    console.log("PASS: Wrong token cannot release another request's lock");


  // Test 6: Different tenants get separate Redis keys.
  const generatedKeys: string[] = [];

  redisMock.set.mock.mockImplementation(async (...args: any[]) => {
    generatedKeys.push(String(args[0]));
    return "OK";
  });

  await acquireIdempotencyKey("company-A", "event-101");
  await acquireIdempotencyKey("company-B", "event-101");

  assert.notEqual(generatedKeys[0], generatedKeys[1]);

  console.log("PASS: Different tenants receive separate idempotency keys");

  // Test 7: Empty tenant ID is rejected.
  await assert.rejects(
    acquireIdempotencyKey("", "event-101"),
    /Tenant ID and idempotency key are required/
  );

  console.log("PASS: Empty tenant ID is rejected");

  console.log("\nAll idempotency service tests passed!");
}

void runTests();

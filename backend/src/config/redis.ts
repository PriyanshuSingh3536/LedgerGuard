
import { Redis } from "ioredis";
import { env } from "./env.js";

// Create a Redis client.
export const redisClient = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

// Handle Redis connection events.
redisClient.on("connect", () => {
  console.log("Redis connection established");
});

redisClient.on("ready", () => {
  console.log("Redis client is ready");
});

redisClient.on("error", (error: Error) => {
  console.error("Redis connection error:", error.message);
});

redisClient.on("close", () => {
  console.log("Redis connection closed");
});

// Connect to Redis.
export async function connectRedis(): Promise<void> {
  if (redisClient.status === "ready") {
    return;
  }

  if (redisClient.status !== "wait") {
    throw new Error(
      `Redis cannot connect from status: ${redisClient.status}`
    );
  }

  await redisClient.connect();
}

// Gracefully disconnect from Redis.
export async function disconnectRedis(): Promise<void> {
  if (
    redisClient.status === "ready" ||
    redisClient.status === "connect"
  ) {
    await redisClient.quit();
  }
}

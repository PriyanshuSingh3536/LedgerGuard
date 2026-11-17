
import "dotenv/config";
import { z } from "zod";

// Define environment variable rules
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(5000),

  // MongoDB Atlas connection URI
  MONGODB_URI: z
    .string()
    .min(1, "MongoDB URI is required")
    .refine(
      (value) =>
        value.startsWith("mongodb://") ||
        value.startsWith("mongodb+srv://"),
      "Invalid MongoDB connection URI"
    ),

      // Redis connection URI
  REDIS_URL: z
    .string()
    .min(1, "Redis URL is required")
    .refine(
      (value) =>
        value.startsWith("redis://") ||
        value.startsWith("rediss://"),
      "Invalid Redis connection URL"
    ),

  // Prefix used for tenant database names
  MONGODB_DB_PREFIX: z
    .string()
    .min(1)
    .default("ledgerguard"),

  // JWT access token expiration
  JWT_ACCESS_TOKEN_TTL: z
    .string()
    .regex(/^\d+(s|m|h|d)$/)
    .default("1h"),

  // RSA key file paths
  JWT_PRIVATE_KEY_PATH: z.string().min(1),
  JWT_PUBLIC_KEY_PATH: z.string().min(1),
});

// Validate environment variables
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment configuration:");
  console.error(z.treeifyError(parsedEnv.error));
  process.exit(1);
}

// Export validated configuration
export const env = parsedEnv.data;

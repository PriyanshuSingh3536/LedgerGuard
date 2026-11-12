
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

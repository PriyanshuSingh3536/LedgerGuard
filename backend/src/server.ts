
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { env } from "./config/env.js";
import authRoutes from "./modules/auth/auth.routes.js";
import tenantRoutes from "./modules/tenant/tenant.routes.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import ledgerRoutes from "./modules/ledger/ledger.routes.js";

const app = express();

// Security and request middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check API
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "LedgerGuard API",
    environment: env.NODE_ENV,
  });
});

// Authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/tenant", tenantRoutes);
app.use("/api/ledger", ledgerRoutes);

// Start server after Redis connection
async function startServer(): Promise<void> {
  try {
    await connectRedis();

    const server = app.listen(env.PORT, () => {
      console.log(`LedgerGuard server running on port ${env.PORT}`);
    });

    // Graceful shutdown
    const shutdown = (signal: string): void => {
      console.log(`${signal} received. Shutting down server...`);

      server.close(async (error) => {
        if (error) {
          console.error("Server shutdown error:", error);
          process.exitCode = 1;
        }

        try {
          await disconnectRedis();
          console.log("Redis connection closed successfully");
        } catch (redisError) {
          console.error("Redis shutdown error:", redisError);
          process.exitCode = 1;
        }
      });
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start LedgerGuard server:", error);

    try {
      await disconnectRedis();
    } catch (redisError) {
      console.error("Redis cleanup error:", redisError);
    }

    process.exitCode = 1;
  }
}

void startServer();

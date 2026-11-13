
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { env } from "./config/env.js";
import authRoutes from "./modules/auth/auth.routes.js";

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

// Start server
app.listen(env.PORT, () => {
  console.log(`LedgerGuard server running on port ${env.PORT}`);
});

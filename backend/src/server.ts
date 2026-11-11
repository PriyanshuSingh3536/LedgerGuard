
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check API
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "LedgerGuard Backend is running successfully!",
    service: "LedgerGuard API",
    environment: env.NODE_ENV,
  });
});

// Start server
app.listen(env.PORT, () => {
  console.log(`LedgerGuard server running on port ${env.PORT}`);
});

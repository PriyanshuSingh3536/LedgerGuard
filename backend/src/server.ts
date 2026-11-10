
import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();

const PORT = 5000;

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
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`LedgerGuard server running on port ${PORT}`);
});

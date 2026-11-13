
import { Router } from "express";

import { authenticateToken } from "../../middleware/auth.middleware.js";

const router = Router();

// Get the authenticated user's identity from the verified JWT.
router.get("/me", authenticateToken, (req, res) => {
  const auth = req.auth;

  if (!auth) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      userId: auth.userId,
      organizationId: auth.organizationId,
      role: auth.role,
    },
  });
});

export default router;

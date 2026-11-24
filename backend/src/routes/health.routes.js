import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", (req, res) => {
  const databaseStates = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const databaseReady = mongoose.connection.readyState === 1;
  const productionUnavailable = process.env.NODE_ENV === "production" && !databaseReady;
  res.status(productionUnavailable ? 503 : 200).json({
    status: productionUnavailable ? "unavailable" : databaseReady ? "ok" : "degraded",
    service: "hidden-gems-api",
    database: databaseStates[mongoose.connection.readyState] || "unknown",
    databaseReady,
    timestamp: new Date().toISOString(),
  });
});

export default router;

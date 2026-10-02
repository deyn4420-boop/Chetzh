import cors from "cors";
import express from "express";
import redisClient from "./configs/redisConfig.js";
import { createLocalLimiter, createUserLimiter } from "./middleware/limiter.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(createUserLimiter(redisClient));
app.use(createLocalLimiter(redisClient));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;

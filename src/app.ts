import express from "express";
import taskRoutes from "./router/Router";
import cors from "cors";
import { LoggerFactory } from "./Logger/LoggerFactory";
const rateLimit = require("express-rate-limit");

const logger = LoggerFactory.getLogger();
const app = express();
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  keyGenerator: (req: any) => req.ip,
  skip: (req: any) => req.user && req.user.isAdmin,
  handler: (req: any, res: any) => {
    res.status(429).json({ error: "Calm down! Try again later." });
  }
});
app.use(limiter);

app.use(
  cors({
    origin: "https://taskmanagement-4l0e.onrender.com",
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);
app.use(express.json());
app.use("/api/tasks", taskRoutes);

app.listen(4000, () => logger.info("Server running on port 4000"));

import express from "express";
import taskRoutes from "./router/Router";
import cors from "cors";
import { LoggerFactory } from "./Logger/LoggerFactory";

const logger = LoggerFactory.getLogger();
const app = express();
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
    credentials: true
  })
);
app.use(express.json());
app.use("/api/tasks", taskRoutes);

app.listen(4000, () => logger.info("Server running on port 4000"));

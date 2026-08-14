import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import env from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import bugRoutes from "./routes/bug.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import { notFound, errorHandler } from "./middleware/error.js";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
if (env.nodeEnv !== "test") app.use(morgan("dev"));

app.use("/uploads", express.static(env.uploadDir, { maxAge: "7d" }));

app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", uptime: process.uptime(), env: env.nodeEnv })
);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bugs", bugRoutes);
app.use("/api/stats", statsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;

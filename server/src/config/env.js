import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));

export const SERVER_DIR = path.resolve(here, "../..");

// The server owns its own env file — see server/.env.example.
dotenv.config({ path: path.join(SERVER_DIR, ".env") });

const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bugtracker",
  jwtSecret: process.env.JWT_SECRET || "dev-only-insecure-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 10),
  uploadDir: path.join(SERVER_DIR, "uploads"),
};

if (env.nodeEnv === "production" && env.jwtSecret.startsWith("dev-only")) {
  throw new Error("JWT_SECRET must be set to a real secret in production.");
}

export default env;

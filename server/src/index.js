import env from "./config/env.js";
import app from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";

async function start() {
  try {
    await connectDB(env.mongoUri);
  } catch (err) {
    console.error(`Could not reach MongoDB at ${env.mongoUri}`);
    console.error(err.message);
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${env.port} is already in use. Stop the process using it, or set PORT in server/.env.`
      );
    } else {
      console.error(err);
    }
    process.exit(1);
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down.`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
  });

  // Without this, an uncaught error exits silently and `node --watch` only
  // reports "Failed running 'src/index.js'" with no clue as to why.
  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception — the server is shutting down:");
    console.error(err);
    process.exit(1);
  });
}

start();

import mongoose from "mongoose";

export async function connectDB(uri) {
  mongoose.set("strictQuery", true);

  // The connection is an EventEmitter: an "error" event with no listener is an
  // uncaught exception, which kills the process the moment MongoDB hiccups.
  // The driver reconnects on its own, so log and keep serving.
  mongoose.connection.on("error", (err) => {
    console.error(`MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected — the driver will keep retrying.");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB reconnected.");
  });

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log(`MongoDB connected → ${mongoose.connection.name}`);
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

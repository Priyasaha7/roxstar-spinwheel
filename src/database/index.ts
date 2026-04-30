import mongoose, { Query, Schema } from "mongoose";
import logger from "../core/logger";
import { db } from "../config";

export async function connectDB() {
  const dbURI = `mongodb+srv://${db.user}:${encodeURIComponent(db.password)}@${db.host}/${db.name}`;

  const options = {
    autoIndex: true,
    minPoolSize: db.minPoolSize,
    maxPoolSize: db.maxPoolSize,
    connectTimeoutMS: 60000,
    socketTimeoutMS: 45000,
  };

  mongoose.set("strictQuery", true);

  // ── Run validators on all update operations ───────────────────
  // By default Mongoose skips schema validators on findOneAndUpdate etc.
  // This plugin forces them to always run — catches bad data before it hits DB.
  function setRunValidators(this: Query<unknown, unknown>) {
    this.setOptions({ runValidators: true });
  }

  mongoose.plugin((schema: Schema) => {
    schema.pre("findOneAndUpdate", setRunValidators);
    schema.pre("updateMany", setRunValidators);
    schema.pre("updateOne", setRunValidators);
    schema.pre(/^update/, setRunValidators);
  });

  try {
    await mongoose.connect(dbURI, options);
    logger.info("MongoDB connection established");
  } catch (err) {
    logger.error("MongoDB connection failed", err);
    process.exit(1);
  }

  mongoose.connection.on("error", (err) =>
    logger.error("MongoDB error: " + err),
  );
  mongoose.connection.on("disconnected", () =>
    logger.warn("MongoDB disconnected"),
  );

  process.on("SIGINT", () => {
    mongoose.connection.close().finally(() => {
      logger.info("MongoDB disconnected — app shutting down");
      process.exit(0);
    });
  });
}

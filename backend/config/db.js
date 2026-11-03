const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

let embeddedMongo = null;

// Ensure mongodb-memory-server reuses the already downloaded binary in backend/node_modules/.cache
const binaryDir = path.resolve(
  __dirname,
  "../node_modules/.cache/mongodb-memory-server"
);
process.env.MONGOMS_DOWNLOAD_DIR = binaryDir;

const sanitizeError = (err) => {
  if (!err) return "Unknown database error";
  const msg = err.message || String(err);
  return msg
    .replace(
      /mongodb(\+srv)?:\/\/[^@]+@[^\s/]+/gi,
      "mongodb$1://***:***@[REDACTED_HOST]"
    )
    .replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, "[REDACTED_URI]");
};

const connectDB = async () => {
  const isProduction = process.env.NODE_ENV === "production";
  const rawURI = process.env.MONGO_URI ? process.env.MONGO_URI.trim() : "";

  if (isProduction && !rawURI) {
    const errorMsg = "MONGO_URI environment variable is missing in production.";
    console.error(`MongoDB connection failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const mongoURI = rawURI || "mongodb://127.0.0.1:27017/code-collab";
  const isAtlas =
    mongoURI.includes("mongodb.net") || mongoURI.startsWith("mongodb+srv://");

  console.log(
    isAtlas ? "Connecting to MongoDB Atlas..." : "Connecting to MongoDB..."
  );

  try {
    // 1. Attempt connection to primary configured URI
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: isProduction ? 15000 : 2000,
    });
    console.log(
      isAtlas
        ? "MongoDB Atlas connected successfully."
        : `MongoDB connected successfully (${conn.connection.host}).`
    );
    return conn;
  } catch (error) {
    const sanitizedErrorMsg = sanitizeError(error);
    console.error(`MongoDB connection failed: ${sanitizedErrorMsg}`);

    if (isProduction) {
      console.error(
        "FATAL: In production, a persistent MONGO_URI must be supplied and accessible. Embedded in-memory MongoDB fallback is disabled in production."
      );
      throw error;
    }

    console.log("Starting embedded local MongoDB engine for development...");

    try {
      const { MongoMemoryServer } = require("mongodb-memory-server");
      const dbDir = path.resolve(__dirname, "../.data/db");
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      embeddedMongo = await MongoMemoryServer.create({
        instance: {
          dbPath: dbDir,
          storageEngine: "wiredTiger",
        },
      });

      const fallbackURI = embeddedMongo.getUri() + "code-collab";
      const conn = await mongoose.connect(fallbackURI);
      console.log(`Embedded Local MongoDB Connected: ${fallbackURI}`);
      console.log(`Database storage persisted at: ${dbDir}`);
      return conn;
    } catch (embeddedErr) {
      console.error(
        `Failed to start embedded MongoDB: ${embeddedErr.message}`
      );
      console.warn(
        "Application running with MongoDB disconnected. Multiplayer rooms remain active."
      );
      return null;
    }
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected.");
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected.");
});

// Clean up embedded server on process shutdown
process.on("SIGINT", async () => {
  if (embeddedMongo) {
    await embeddedMongo.stop();
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  if (embeddedMongo) {
    await embeddedMongo.stop();
  }
  process.exit(0);
});

module.exports = connectDB;

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable in .env.local"
  );
}

/**
 * Global cache so hot-reloads in development don't open new connections.
 */
const globalForMongoose = globalThis as typeof globalThis & {
  _mongoosePromise?: Promise<typeof mongoose>;
};

export default async function dbConnect() {
  if (globalForMongoose._mongoosePromise) {
    return globalForMongoose._mongoosePromise;
  }

  globalForMongoose._mongoosePromise = mongoose.connect(MONGODB_URI!, {
    dbName: process.env.MONGODB_DB_NAME ?? "gpubnb",
  });

  return globalForMongoose._mongoosePromise;
}

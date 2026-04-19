import mongoose from "mongoose";

/**
 * Guard against build-time crash: if MONGODB_URI is not set, dbConnect()
 * returns a rejected promise at call-time instead of throwing at import-time.
 */
const MONGODB_URI = process.env.MONGODB_URI;

const globalForMongoose = globalThis as typeof globalThis & {
  _mongoosePromise?: Promise<typeof mongoose>;
};

export default async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error(
      "Please define the MONGODB_URI environment variable in .env"
    );
  }

  if (globalForMongoose._mongoosePromise) {
    return globalForMongoose._mongoosePromise;
  }

  globalForMongoose._mongoosePromise = mongoose.connect(MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME ?? "gpubnb",
  });

  return globalForMongoose._mongoosePromise;
}

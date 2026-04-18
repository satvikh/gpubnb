import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME ?? "gpubnb";

let clientPromise: Promise<MongoClient> | null = null;

export function getMongoClient() {
  if (!uri) {
    // TODO: Replace mock-store route handlers with MongoDB Atlas queries once env is configured.
    return null;
  }

  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }

  return clientPromise;
}

export async function getMongoDb() {
  const client = await getMongoClient();
  return client?.db(dbName) ?? null;
}

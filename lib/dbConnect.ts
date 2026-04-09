import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalWithMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cached = globalWithMongoose.mongooseCache ?? {
  conn: null,
  promise: null,
};

globalWithMongoose.mongooseCache = cached;

export async function dbConnect() {
  if (cached.conn) return cached.conn;

  const mongoUri = process.env.MONGODB_URI ?? "";
  if (!mongoUri) {
    throw new Error("Please define the MONGODB_URI environment variable");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoUri).then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

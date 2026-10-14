import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

// A single in-memory MongoDB *replica set* (not standalone) is required
// because mongoose sessions / transactions (used throughout booking.service.js)
// only work against a replica set. This is what lets us actually test the
// atomic seat-locking logic for real, instead of mocking it away.
let replSet;

export const connectTestDb = async () => {
    replSet = await MongoMemoryReplSet.create({
        replSet: { count: 1 }, // single-node replica set is enough for transactions
    });
    const uri = replSet.getUri();
    await mongoose.connect(uri);
};

export const disconnectTestDb = async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
};

// Wipes all collections between tests so tests don't leak state into each other
export const clearTestDb = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
};

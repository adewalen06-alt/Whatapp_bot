import dotenv from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";

dotenv.config();

const uri = process.env.MONGODB_KEY?.trim();
if (!uri) {
  throw new Error("MONGODB_KEY is required. Add a valid MongoDB connection string in Render Environment settings.");
}
if (!/^mongodb(?:\+srv)?:\/\//.test(uri)) {
  throw new Error("MONGODB_KEY must start with mongodb:// or mongodb+srv://");
}

const mdClient = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

export const mongoReady = (async () => {
  try {
    await mdClient.connect();
    console.log("Connected to MongoDB");

    const db = mdClient.db("MyBotDataDB");
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((col) => col.name);

    if (!collectionNames.includes("AuthTable")) {
      await db.createCollection("AuthTable");
      console.log("Created AuthTable collection");
    }

    // Index for group member queries ($inc / $set by members.id)
    // Use sparse: true to match any existing index definition and avoid conflicts
    await db
      .collection("Groups")
      .createIndex({ "members.id": 1 }, { background: true, sparse: true });
  } catch (err) {
    console.error("MongoDB connection failed:", err.message || err);
    throw err;
  }
})();

export default mdClient;

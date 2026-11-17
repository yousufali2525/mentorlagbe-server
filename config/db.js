
import dns from "node:dns";
import { MongoClient } from "mongodb";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

let client;
let appDb;
let authDb;

const connectDB = async () => {
  try {
    client = new MongoClient(process.env.MONGODB_URI);

    await client.connect();

    appDb = client.db(process.env.DB_NAME || "mentorlagbe");
    authDb = client.db(process.env.AUTH_DB_NAME || "mentorlagbe_auth");

    await appDb.command({ ping: 1 });
    await authDb.command({ ping: 1 });

    const collections = [
      "users",
      "tuitions",
      "applications",
      "payments",
    ];

    for (const name of collections) {
      const exists = await appDb
        .listCollections({ name }, { nameOnly: true })
        .hasNext();

      if (!exists) {
        await appDb.createCollection(name);
      }
    }

    await appDb.collection("users").createIndex(
      { email: 1 },
      { unique: true }
    );

    const applicationCollection = appDb.collection("applications");

    const indexes = await applicationCollection.listIndexes().toArray();

    const oldIndex = indexes.find(
      (index) => index.name === "tuitionId_1_studentEmail_1"
    );

    if (oldIndex) {
      await applicationCollection.dropIndex(oldIndex.name);
    }

    await applicationCollection.createIndex(
      { tuitionId: 1, studentId: 1 },
      {
        unique: true,
        name: "unique_tuition_student",
      }
    );

    await appDb.collection("payments").createIndex(
      { stripeSessionId: 1 },
      { unique: true, sparse: true }
    );

    await appDb.collection("tuitions").createIndex({
      approvalStatus: 1,
      isActive: 1,
      createdAt: -1,
    });

    console.log("MongoDB Connected Successfully");
    console.log("Four Application Collections Ready");
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
    throw error;
  }
};

const getAppDb = () => {
  if (!appDb) {
    throw new Error("Application database is not connected");
  }

  return appDb;
};

const getAuthDb = () => {
  if (!authDb) {
    throw new Error("Authentication database is not connected");
  }

  return authDb;
};

export { client, connectDB, getAppDb, getAuthDb };

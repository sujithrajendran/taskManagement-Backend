import { MongoClient, Db } from "mongodb";

export default class DBConnectionService {
  async getDBConnection(dbName: string): Promise<Db> {
    try {
      const uri = process.env.MONGO_URI;
      const client = new MongoClient(uri!, {
        tls: true
      });
      await client.connect();
      const db = client.db(dbName);
      return db;
    } catch (error) {
      console.error("Error in getting DB Connection ", error);
      throw error;
    }
  }
}

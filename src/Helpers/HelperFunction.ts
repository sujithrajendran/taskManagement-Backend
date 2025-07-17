import { Db } from "mongodb";
import DBConnectionService from "../dbService/DbConnectionService";
import { User } from "../model/User";
import { LoggerFactory } from "../Logger/LoggerFactory";

const SIGNIN_COLLECTION = "signin";
const Task_COLLECTION = "task";
const DATABASE = "taskmanagement";
const logger = LoggerFactory.getLogger();

export class HelperFunction {
  async getNextTaskIdFromDB(db: Db): Promise<number> {
    const lastTask = await db
      .collection(Task_COLLECTION)
      .find({ taskId: { $exists: true } })
      .sort({ taskId: -1 })
      .limit(1)
      .project({ taskId: 1 })
      .toArray();
    const lastId = parseInt(lastTask[0]?.taskId || "100", 10);
    const nextId = lastId + 1;
    return nextId;
  }

  async getNextUserIdFromDB(db: Db): Promise<number> {
    const lastTask = await db
      .collection(SIGNIN_COLLECTION)
      .find({ userId: { $exists: true } })
      .sort({ userId: -1 })
      .limit(1)
      .project({ userId: 1 })
      .toArray();
    const lastId = parseInt(lastTask[0]?.userId || "100", 10);
    const nextId = lastId + 1;
    return nextId;
  }

  async insertUser(email: string, username?: string) {
    (async () => {
      try {
        if (!username) {
          username = email.split("@")[0];
        }
        const db = await new DBConnectionService().getDBConnection(DATABASE);
        const existingUser = await db
          .collection(SIGNIN_COLLECTION)
          .findOne({ email, isActive: true });
        if (!existingUser) {
          logger.info(`Inside inserting user details ::`);
          const userId = await new HelperFunction().getNextUserIdFromDB(db);
          const user = new User(username, "", email, new Date(), userId, true);
          await db.collection(SIGNIN_COLLECTION).insertOne(user);
        }
      } catch (err) {
        logger.error("Background user insert failed", err);
      }
    })();
  }
}

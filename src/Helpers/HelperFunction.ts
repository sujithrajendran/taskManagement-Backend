import { Db } from "mongodb";

const SIGNIN_COLLECTION = "signin";
const Task_COLLECTION = "task";

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
}

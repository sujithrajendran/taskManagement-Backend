import express from "express";
import DBConnectionService from "../dbService/DbConnectionService";
import { LoggerFactory } from "../Logger/LoggerFactory";
import { Db } from "mongodb";

const router = express.Router();
const COLLECTION = "task";
const DATABASE = "taskmanagement";
const logger = LoggerFactory.getLogger();

// Projection
const projection = {
  _id: 0,
  taskName: 1,
  taskId: 1,
  description: 1,
  status: 1,
  createdAt: 1,
  createdBy: 1,
  priority: 1
};

async function getNextTaskIdFromDB(db: Db): Promise<number> {
  const lastTask = await db
    .collection(COLLECTION)
    .find({ taskId: { $exists: true } })
    .sort({ taskId: -1 })
    .limit(1)
    .project({ taskId: 1 })
    .toArray();
  const lastId = parseInt(lastTask[0]?.taskId || "100", 10);
  const nextId = lastId + 1;
  return nextId;
}

// GET all tasks
router.get("/", async (_req, res) => {
  try {
    logger.info("Inside getting task details for all tasks");
    const db = await new DBConnectionService().getDBConnection(DATABASE);
    const data = await db
      .collection(COLLECTION)
      .find({ isActive: true })
      .project(projection)
      .toArray();
    res.status(200).json({ tasks: data });
  } catch (error) {
    logger.error("Error fetching all tasks:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET task by taskId
router.get("/:taskId", async (req: any, res: any) => {
  try {
    const taskId = parseInt(req.params.taskId);
    logger.info(`Inside getting task details for taskId :: ${taskId}`);

    if (!taskId) {
      return res.status(400).json({ error: "Task ID is required" });
    }

    const db = await new DBConnectionService().getDBConnection(DATABASE);
    const foundTask = await db
      .collection(COLLECTION)
      .findOne({ taskId, isActive: true }, { projection });

    if (foundTask) {
      res.status(200).json({ task: [foundTask] });
    } else {
      res.status(404).json({ error: `Task '${taskId}' not found.` });
    }
  } catch (error) {
    logger.error("Error fetching task:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST create task
router.post("/", async (req: any, res: any) => {
  try {
    const task = req.body;
    logger.info(`Creating task: ${JSON.stringify(task)}`);

    if (!task || !task.taskName) {
      return res.status(400).json({ error: "TaskName is required" });
    }
    const db = await new DBConnectionService().getDBConnection(DATABASE);

    task.isActive = true;
    task.taskId = await getNextTaskIdFromDB(db);

    await db.collection(COLLECTION).createIndex({ taskName: 1 }, { unique: true });
    await db.collection(COLLECTION).insertOne(task);
    res
      .status(201)
      .json({ message: "Task created successfully", taskId: task.taskId });
  } catch (error: any) {
    if (error.code === 11000 && error.keyPattern?.taskName) {
      return res.status(400).json({ error: "Task already present" });
    }
    logger.error("Error while creating task:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT update task by taskId
router.put("/:taskId", async (req: any, res: any) => {
  try {
    const updatedFields = req.body;
    const taskId = parseInt(req.params.taskId);
    logger.info(
      `Updating taskId: ${taskId} with data: ${JSON.stringify(updatedFields)}`
    );

    if (!taskId || !updatedFields) {
      return res.status(400).json({ error: "Task ID and data required" });
    }

    const db = await new DBConnectionService().getDBConnection(DATABASE);
    const result = await db
      .collection(COLLECTION)
      .updateOne({ taskId, isActive: true }, { $set: updatedFields });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: `Task '${taskId}' not found` });
    }

    res.status(200).json({ message: "Task updated successfully" });
  } catch (error) {
    logger.error("Error while updating task:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE task by taskId
router.delete("/:taskId", async (req: any, res: any) => {
  try {
    const taskId = parseInt(req.params.taskId);
    logger.info(`Deleting taskId: ${taskId}`);

    if (!taskId) {
      return res.status(400).json({ error: "Task ID is required" });
    }

    const db = await new DBConnectionService().getDBConnection(DATABASE);
    const result = await db
      .collection(COLLECTION)
      .updateOne({ taskId, isActive: true }, { $set: { isActive: false } });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: `Task '${taskId}' not found` });
    }

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    logger.error("Error while deleting task:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET charts
router.post("/chart", async (req: any, res: any) => {
  try {
    const chartkey = req.body.chartKey;
    logger.info(`Inside getting chart data for chartKey:: ${chartkey}`);
    const db = await new DBConnectionService().getDBConnection(DATABASE);
    const chartDatas = await db
      .collection(COLLECTION)
      .aggregate([
        {
          $match: {
            isActive: true
          }
        },
        {
          $group: {
            _id: `$${chartkey}`,
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            status: "$_id",
            count: 1
          }
        }
      ])
      .toArray();
    if (chartDatas) {
      const status = [];
      const values = [];
      for (const data of chartDatas) {
        status.push(data.status);
        values.push(data.count);
      }
      const chartData = {
        title: {
          text: "Task Summary"
        },
        tooltip: {},
        xAxis: {
          data: status
        },
        yAxis: {},
        series: [
          {
            name: "Tasks",
            type: "bar",
            data: values
          }
        ]
      };
      res.status(200).json({ chartData: chartData });
    } else {
      res.status(200).json({ chartData: {} });
    }
  } catch (error) {
    logger.error("Error fetching all tasks:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

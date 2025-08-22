import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { LoggerFactory } from "./Logger/LoggerFactory";
import { HelperFunction } from "./Helpers/HelperFunction";
import rateLimit from "express-rate-limit";
import DBConnectionService from "./dbService/DbConnectionService";
import router from "./router/Router";
import { authenticateSocket } from "./Auth/Authenticate";
import { EmailHelper } from "./Helpers/EmailHelper";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://taskmanagement-4l0e.onrender.com"
  }
});
// app.use(
//   cors({
//     origin: "https://taskmanagement-4l0e.onrender.com",
//   })
// );

app.use(server, {
  cors: {
    origin: "https://taskmanagement-4l0e.onrender.com"
  }
});
const logger = LoggerFactory.getLogger();
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000
});

const SIGNIN_COLLECTION = "signin";
const DATABASE = "taskmanagement";
const TASK_COLLECTION = "task";

app.use(cors());
app.use(express.json());
app.use(limiter);

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

io.on("connection", (socket) => {
  logger.info("Client connected:", socket.id);

  // GET task
  socket.on("getTask", async () => {
    try {
      logger.info("Inside getting task details for all tasks");
      const db = await new DBConnectionService().getDBConnection(DATABASE);
      const data = await db
        .collection(TASK_COLLECTION)
        .find({ isActive: true })
        .project(projection)
        .toArray();
      io.emit("getTask", { tasks: data });
    } catch (error) {
      logger.error("Error fetching all tasks:", error);
      io.emit("error", { error: "Internal Server Error" });
    }
  });

  // GET task by taskId
  socket.on("getParticularTask", async (taskData: any) => {
    try {
      const taskId = parseInt(taskData.taskId);
      logger.info(`Inside getting task details for taskId :: ${taskId}`);

      if (!taskId) {
        io.emit("getParticularTask", { error: "Task ID is required" });
      }

      const db = await new DBConnectionService().getDBConnection(DATABASE);
      const foundTask = await db
        .collection(TASK_COLLECTION)
        .findOne({ taskId, isActive: true }, { projection });
      if (foundTask) {
        io.emit("getParticularTask", { task: [foundTask] });
      } else {
        io.emit("getParticularTask", { error: `Task '${taskId}' not found.` });
      }
    } catch (error) {
      logger.error("Error fetching task:", error);
      io.emit("getParticularTask", { error: "Internal Server Error" });
    }
  });

  // Create Task
  socket.on("createTask", async (data) => {
    try {
      const { taskData, headers } = data;
      const token = headers?.Authorization;
      const decodedUser = await authenticateSocket(token, io);
      logger.info(`Inside create task:: ${JSON.stringify(taskData)}`);
      const db = await new DBConnectionService().getDBConnection(DATABASE);
      taskData.isActive = true;
      taskData.taskId = await new HelperFunction().getNextTaskIdFromDB(db);
      await db.collection(TASK_COLLECTION).createIndex(
        { taskName: 1 },
        {
          unique: true
        }
      );
      await db.collection(TASK_COLLECTION).insertOne(taskData);
      io.emit("createTask", { message: "Task created Successfully" });
      const email = await HelperFunction.getEmailIdFromTask(taskData);
      if (email) {
        const response = await new EmailHelper().sendTaskNotification(
          taskData,
          email
        );
      }
    } catch (error) {
      logger.error("Socket error while creating task:", error);
      io.emit("error", { message: "Failed to create task" });
    }
  });

  // getUsersIn the task
  socket.on("getRegisteredUser", async () => {
    try {
      logger.info(`Inside getting registred users ::`);
      const db = await new DBConnectionService().getDBConnection(DATABASE);
      const users: any = await db
        .collection(SIGNIN_COLLECTION)
        .find({ isActive: true })
        .project({ userName: 1, _id: 0 })
        .toArray();
      const allUsers = users.map((user: any) => user.userName);
      // const users = [
      //   "sujith",
      //   "sujith R"
      // ];
      if (!allUsers) {
        io.emit("error", { message: "No user registred" });
      }
      io.emit("getRegisteredUser", { allUsers });
    } catch (error) {
      logger.error("Socket error while creating task:", error);
      io.emit("error", { message: "Failed to get registred user" });
    }
  });

  // Update Task
  socket.on("updateTask", async (taskData) => {
    try {
      const updatedFields = taskData.taskData;
      const taskId = parseInt(taskData.taskId);
      logger.info(
        `Updating taskId: ${taskId} with data: ${JSON.stringify(updatedFields)}`
      );

      if (!taskId || !updatedFields) {
        io.emit("error", { error: "Task ID and data required" });
      }

      const db = await new DBConnectionService().getDBConnection(DATABASE);
      const result = await db
        .collection(TASK_COLLECTION)
        .updateOne({ taskId, isActive: true }, { $set: updatedFields });

      if (result.matchedCount === 0) {
        io.emit("error", { error: `Task '${taskId}' not found` });
      }

      io.emit("updateTask", { message: "Task updated successfully" });
      // TODO: Need to send mail if the task is completed
    } catch (error: any) {
      if (error.code === 11000 && error.keyPattern?.taskName) {
        io.emit("error", { error: "Task already present" });
      }
      logger.error("Error while updating task:", error);
      io.emit("error", { error: "Internal Server Error" });
    }
  });

  // Delete Task
  socket.on("deleteTask", async (data) => {
    try {
      let { taskId, headers } = data;
      taskId = parseInt(taskId);
      const token = headers?.Authorization;
      const decodedUser = await authenticateSocket(token, io);
      logger.info(`Inside daleting task for taskId: ${JSON.stringify(taskId)}`);
      const db = await new DBConnectionService().getDBConnection(DATABASE);
      await db
        .collection(TASK_COLLECTION)
        .updateOne({ taskId, isActive: true }, { $set: { isActive: false } });

      io.emit("deleteTask", { taskId });
    } catch (error) {
      logger.error("Socket error while deleting task:", error);
      io.emit("error", { message: "Failed to delete task" });
    }
  });

  // GET charts
  socket.on("getChart", async (chartRequest: any) => {
    try {
      logger.info(
        `Inside getting chart data for chartKey:: ${JSON.stringify(
          chartRequest
        )}`
      );
      const chartkey = chartRequest["chartKey"];
      const db = await new DBConnectionService().getDBConnection(DATABASE);
      const chartDatas = await db
        .collection(TASK_COLLECTION)
        .aggregate([
          { $match: { isActive: true } },
          { $group: { _id: `$${chartkey}`, count: { $sum: 1 } } },
          { $project: { _id: 0, status: "$_id", count: 1 } }
        ])
        .toArray();

      const status = chartDatas.map((d) => d.status);
      const values = chartDatas.map((d) => d.count);

      const chartData = {
        title: { text: "Task Summary" },
        tooltip: {},
        xAxis: { data: status },
        yAxis: {},
        series: [{ name: "Tasks", type: "bar", data: values }]
      };

      socket.emit("getChart", { chartData });
    } catch (error) {
      logger.error("Error fetching chart data:", error);
      io.emit("getChart", {
        chartData: {},
        error: "Internal Server Error"
      });
    }
  });

  socket.on("disconnect", () => {
    logger.info("Client disconnected:", socket.id);
  });
});

app.use("/api/tasks", router);
server.listen(4000, () => {
  logger.info("Server running on port 4000");
});

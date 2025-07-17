import express from "express";
import { LoggerFactory } from "../Logger/LoggerFactory";
import DBConnectionService from "../dbService/DbConnectionService";
import { User } from "../model/User";
import { HelperFunction } from "../Helpers/HelperFunction";
import { authenticate } from "../Auth/Authenticate";
import { EmailHelper } from "../Helpers/EmailHelper";
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
import moment from "moment";
const router = express.Router();

const SIGNIN_COLLECTION = "signin";
const OTP_LOGIN = "otp_login";
const Task_COLLECTION = "task";
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

// Register
router.post("/register", async (req: any, res: any) => {
  try {
    logger.info(`Inside regstering the user ::`);
    if (!req.body) {
      return res.status(400).json({ error: "SignUp details is required" });
    }
    const db = await new DBConnectionService().getDBConnection(DATABASE);
    const userId = await new HelperFunction().getNextUserIdFromDB(db);
    const user: User = new User(
      req.body.userName,
      req.body.password,
      req.body.email,
      new Date(),
      userId,
      true,
      false
    );
    const hashed = await bcrypt.hash(user.password, 10);
    user.password = hashed;
    await db
      .collection(SIGNIN_COLLECTION)
      .createIndex({ email: 1 }, { unique: true });
    await db.collection(SIGNIN_COLLECTION).insertOne(user);
    res.status(201).json({
      message: "User registered successfully",
      userName: user.userName
    });

    res.status(201).json({ message: "User created" });
  } catch (error: any) {
    if (error.code === 11000 && error.keyPattern?.taskName) {
      return res.status(400).json({ error: "User Email already present" });
    }
    logger.error("Error while registering the user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Login
router.post("/login", async (req: any, res: any) => {
  try {
    logger.info(`Inside login :: ${JSON.stringify(req.body)}`);
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Please enter email and password" });
    }
    const db = await new DBConnectionService().getDBConnection(DATABASE);
    const user: any = await db
      .collection(SIGNIN_COLLECTION)
      .findOne(
        { isActive: true, email: email },
        { projection: { email: 1, password: 1, userId: 1 } }
      );
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign(
      { userId: user.userId, email: user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h"
      }
    );
    res.json({ token });
  } catch (error) {
    logger.error("Error while login:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/forget-password", async (req: any, res: any) => {
  try {
    logger.info(`Inside resetPassword link generation::`);
    const email = req.body.email;
    if (!email) {
      return res.status(400).json({ error: "Email ID is required" });
    }
    const db = await new DBConnectionService().getDBConnection(DATABASE);
    const validateEmail = await db
      .collection(SIGNIN_COLLECTION)
      .findOne({ email, isActive: true }, { projection: { email: 1 } });

    if (!validateEmail) {
      return res.status(400).json({ error: "Email ID is not registered" });
    }

    const response = await new EmailHelper().sendForgetPasswordMail(email);
    if (response) {
      res.status(200).json({ message: "Reset link sent to email" });
    } else {
      res.status(500).json({ message: "Failed to send email" });
    }
  } catch (error) {
    logger.error("Error while sending email:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/reset-password", authenticate, async (req: any, res: any) => {
  try {
    logger.info(`Inside reset password ::`);
    const password = req.body.password;
    const email = req.headers.email;
    const hashed = await bcrypt.hash(password, 10);

    const db = await new DBConnectionService().getDBConnection(DATABASE);
    await db
      .collection(SIGNIN_COLLECTION)
      .findOneAndUpdate(
        { isActive: true, email },
        { $set: { password: hashed } }
      );

    res.status(200).json({ message: "Password reseted successfully" });
  } catch (error) {
    logger.error("Error while reseting password", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Google Login
router.post("/google-login", async (req: any, res: any) => {
  try {
    logger.info(`Inside google login ::`);
    const { email, sub: googleId } = req.body.token;
    const userName = req.body.token.name;
    if (!email || !googleId) {
      return res.status(400).json({ error: "Invalid Google user data" });
    }
    const appToken = jwt.sign({ email, googleId }, process.env.JWT_SECRET, {
      expiresIn: "1h"
    });

    res.json({ token: appToken });
    await new HelperFunction().insertUser(email, userName);
  } catch (error) {
    console.error("Error during Google login", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Google OTP Login
router.post("/send-otp", async (req: any, res: any) => {
  try {
    const { email } = req.body;
    logger.info(`Inside send otp to user :: ${email}`);
    if (!email) {
      return res.status(400).json({ error: "Email is missing" });
    }

    const db = await new DBConnectionService().getDBConnection(DATABASE);
    const user: any = await db
      .collection(SIGNIN_COLLECTION)
      .findOne({ isActive: true, email }, { projection: { email: 1 } });

    if (!user) {
      return res.status(200).json({ message: "Enter registred Email" });
    }

    const passcode = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = moment().add(5, "minutes").format();
    const otpResponse = await new EmailHelper().sendLoginOtpMail(
      email,
      passcode
    );

    if (otpResponse) {
      res.status(200).json({ message: "Otp Sent successfully" });
    } else {
      res.status(500).json({ message: "Failed to send otp" });
    }
    await db.collection(OTP_LOGIN).deleteMany({ email });
    await db.collection(OTP_LOGIN).insertOne({
      email,
      passcode,
      expiresAt
    });
  } catch (error) {
    console.error("Error during Google login", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Verify OTP
router.post("/verify-otp", async (req: any, res: any) => {
  try {
    logger.info(`Inside sending verify otp ::`);
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Enter valid pin" });
    }
    const db = await new DBConnectionService().getDBConnection(DATABASE);
    const userOtp: any = await db
      .collection(OTP_LOGIN)
      .findOne({ email }, { projection: { passcode: 1, expiresAt: 1 } });
    const currentTime = moment();

    if (
      !userOtp ||
      currentTime.isAfter(userOtp.expiresAt) ||
      userOtp.passcode !== otp
    ) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    const appToken = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "1h"
    });
    res.json({ token: appToken });
  } catch (error) {
    logger.error("Error fetching all tasks:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET all tasks
router.get("/", authenticate, async (req, res) => {
  try {
    logger.info("Inside getting task details for all tasks");
    const db = await new DBConnectionService().getDBConnection(DATABASE);
    const data = await db
      .collection(Task_COLLECTION)
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
      .collection(Task_COLLECTION)
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
    task.taskId = await new HelperFunction().getNextTaskIdFromDB(db);
    await db.collection(Task_COLLECTION).createIndex(
      { taskName: 1 },
      {
        unique: true
      }
    );
    await db.collection(Task_COLLECTION).insertOne(task);
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
      .collection(Task_COLLECTION)
      .updateOne({ taskId, isActive: true }, { $set: updatedFields });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: `Task '${taskId}' not found` });
    }

    res.status(200).json({ message: "Task updated successfully" });
  } catch (error: any) {
    if (error.code === 11000 && error.keyPattern?.taskName) {
      return res.status(400).json({ error: "Task already present" });
    }
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
      .collection(Task_COLLECTION)
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
      .collection(Task_COLLECTION)
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

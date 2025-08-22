import nodemailer from "nodemailer";
import { LoggerFactory } from "../Logger/LoggerFactory";
const logger = LoggerFactory.getLogger();
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

export class EmailHelper {
  async sendForgetPasswordMail(email: string) {
    const token = jwt.sign({ email: email }, process.env.JWT_SECRET, {
      expiresIn: "1h"
    });
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    const html = this.getResetPasswordTemplate(resetLink);
    const mailOptions = {
      from: `"Task Manager Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset your password",
      html: html
    };
    try {
      logger.info(`Inside sending email to user ::`);
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      throw new Error("Error while sending Email");
    }
  }

  async sendLoginOtpMail(email: string, otp: number) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    const html = this.getOTPTemplate(otp);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      html
    };

    try {
      logger.info(`Inside sending email to user ::`);
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      throw new Error("Error while sending Email");
    }
  }

  getOTPTemplate(otp: number) {
    const templatePath = path.join(
      process.cwd(),
      "src",
      "Design",
      "GoogleLoginOtp.html"
    );
    const template = fs.readFileSync(templatePath, "utf-8");
    return template.replace("{{OTP_CODE}}", otp.toString());
  }

  getResetPasswordTemplate(resetLink: string): string {
    const templatePath = path.join(
      process.cwd(),
      "src",
      "Design",
      "ForgotPassword.html"
    );
    let html = fs.readFileSync(templatePath, "utf-8");
    html = html.replace("{{RESET_LINK}}", resetLink);
    return html;
  }

  async sendTaskNotification(taskData: any, email: string, taskType: string) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const html = this.getAssignTaskTemplate(taskData, taskType);
    let taskSubject = "New Task Assigned: ";

    if (taskType === "Completed") {
      taskSubject = "Task Completed:";
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `${taskSubject} ${taskData.taskName}`,
      html
    };
    try {
      logger.info(`Inside sending email to user ::`);
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      throw new Error("Error while sending Email");
    }
  }

  getAssignTaskTemplate(taskData: any, taskType: string) {
    const templatePath = path.join(
      process.cwd(),
      "src",
      "Design",
      "TaskAssign.html"
    );
    let taskHeading = "A new task has been assigned to you";
    if (taskType === "Completed") {
      taskHeading = "Task has been completed";
    }
    let template = fs.readFileSync(templatePath, "utf-8");

    template = template
      .replace(/{{userName}}/g, taskData.userName || "")
      .replace(/{{taskName}}/g, taskData.taskName || "")
      .replace(/{{description}}/g, taskData.description || "")
      .replace(/{{priority}}/g, taskData.priority || "")
      .replace(/{{status}}/g, taskData.status || "")
      .replace(/{{dueDate}}/g, taskData.createdAt || "")
      .replace(/{{taskHeading}}/g, taskHeading)
      .replace(
        /{{taskLink}}/g,
        `${process.env.FRONTEND_URL}/task/${taskData.taskId}` || "#"
      );
    logger.info(`template :: ${JSON.stringify(template)}`);
    return template;
  }
}

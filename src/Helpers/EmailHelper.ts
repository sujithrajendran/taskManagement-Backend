import nodemailer from "nodemailer";
import { LoggerFactory } from "../Logger/LoggerFactory";
const logger = LoggerFactory.getLogger();
const jwt = require("jsonwebtoken");

export class EmailHelper {
  async sendEmail(email: string) {
    const token = jwt.sign(
      { email: email },
      process.env.JWT_SECRET
      // {
      //   expiresIn: "10h"
      // }
    );
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"Task Manager Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset your password",
      html: `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}" target="_blank">${resetLink}</a>
      <p>This link will expire in 1 hour.</p>
    `
    };
    try {
      logger.info(`Inside sending email to user ::`);
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      throw new Error("Error while sending Email");
    }
  }
}

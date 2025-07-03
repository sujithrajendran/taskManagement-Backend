// logger.ts
import { createLogger, format, transports, Logger } from "winston";
const { combine, timestamp, printf, colorize } = format;

export class LoggerFactory {
  private static logger: Logger;

  public static getLogger(): Logger {
    if (!LoggerFactory.logger) {
      const customFormat = printf(({ level, message, timestamp }) => {
        return `[${timestamp}] ${level}: ${message}`;
      });

      LoggerFactory.logger = createLogger({
        level: "info",
        format: combine(
          colorize(),
          timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
          customFormat
        ),
        transports: [
          new transports.Console(),
        //   new transports.File({ filename: "logs/error.log", level: "error" }),
        //   new transports.File({ filename: "logs/combined.log" })
        ]
      });
    }
    return LoggerFactory.logger;
  }
}

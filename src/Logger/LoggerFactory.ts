// logger.ts
import { createLogger, format, transports, Logger } from "winston";
import { getNamespace } from "cls-hooked";
import { v4 as uuidv4 } from "uuid";

const { combine, timestamp, printf, colorize } = format;

export class LoggerFactory {
  private static logger: Logger;

  public static getLogger(): Logger {
    if (!LoggerFactory.logger) {
      const customFormat = printf(({ level, message, timestamp, traceId }) => {
        return `[${timestamp}] ${level}: [${traceId}] ${message}`;
      });

      LoggerFactory.logger = createLogger({
        level: "info",
        format: combine(
          colorize(),
          timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
          format((info) => {
            const ns = getNamespace("traceId");
            info.traceId = ns?.get("correlationId") || uuidv4();
            return info;
          })(),
          customFormat
        ),
        transports: [new transports.Console()]
      });
    }

    return LoggerFactory.logger;
  }
}

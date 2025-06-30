import winston from "winston";

export class Logger {
  private static instances = new Map<string, Logger>();
  private logger: winston.Logger;
  private serviceName: string;

  private constructor(
    serviceName: string = "mcp-service",
    logDir: string = "logs"
  ) {
    this.serviceName = serviceName;
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: serviceName },
      transports: [
        new winston.transports.File({
          filename: `${logDir}/error.log`,
          level: "error",
        }),
        new winston.transports.File({ filename: `${logDir}/combined.log` }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, service }) => {
              return `${timestamp} [${service}] ${level}: ${message}`;
            })
          ),
        }),
      ],
    });
  }

  public static getInstance(
    serviceName: string = "mcp-service",
    logDir: string = "logs"
  ): Logger {
    const key = `${serviceName}:${logDir}`;

    if (!Logger.instances.has(key)) {
      Logger.instances.set(key, new Logger(serviceName, logDir));
    }

    return Logger.instances.get(key)!;
  }

  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  public error(message: string, error?: any): void {
    this.logger.error(message, error);
  }

  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  public getServiceName(): string {
    return this.serviceName;
  }
}

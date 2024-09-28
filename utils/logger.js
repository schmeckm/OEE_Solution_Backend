const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");
const dotenv = require("dotenv");

// Load the .env file
dotenv.config();

// Define the log format
const logFormat = winston.format.printf(
  ({ level, message, timestamp, ...metadata }) => {
    let logMessage = `${timestamp} ${level}: ${message}`;
    if (Object.keys(metadata).length) {
      logMessage += `\n${JSON.stringify(metadata, null, 2)}`;
    }
    return logMessage;
  }
);

// Load log levels and settings
const logLevels = (process.env.LOG_LEVELS || "info")
  .split(",")
  .map((level) => level.trim());
const retentionDays = process.env.LOG_RETENTION_DAYS || 14;
const logToConsole = process.env.LOG_TO_CONSOLE === "true";
const logToFile = process.env.LOG_TO_FILE === "true";

/**
 * Custom filter to only allow specified log levels.
 * @param {Object} info - Log information.
 * @returns {Object|boolean} Log information or false if the level is not included.
 */
const customFilter = winston.format((info) =>
  logLevels.includes(info.level) ? info : false
);

/**
 * Helper function to create a log transport.
 * @param {string} type - Type of transport ('console' or 'file').
 * @param {string} [filename] - Filename for file transport.
 * @returns {Object|null} - Configured transport or null if not applicable.
 */
const createTransport = (type, filename) => {
  if (type === "console" && logToConsole) {
    return new winston.transports.Console({
      level: logLevels[0],
      format: winston.format.combine(
        customFilter(),
        winston.format.colorize(),
        winston.format.timestamp(),
        logFormat
      ),
    });
  }

  if (type === "file" && logToFile) {
    return new DailyRotateFile({
      filename: path.join(__dirname, `../logs/${filename}-%DATE%.log`),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: `${retentionDays}d`,
      level: logLevels[0],
      format: winston.format.combine(
        customFilter(),
        winston.format.timestamp(),
        logFormat
      ),
    });
  }

  return null;
};

/**
 * Creates a Winston logger.
 * @param {string} logFilename - Name of the log file.
 * @returns {Object} Winston logger.
 */
const createLogger = (logFilename = "app") => {
  const transports = [];
  const exceptionHandlers = [];
  const rejectionHandlers = [];

  if (logToConsole) {
    const consoleTransport = createTransport("console");
    if (consoleTransport) {
      transports.push(consoleTransport);
    }
  }

  if (logToFile) {
    const fileTransport = createTransport("file", logFilename);
    if (fileTransport) {
      transports.push(fileTransport);
      exceptionHandlers.push(createTransport("file", "exceptions"));
      rejectionHandlers.push(createTransport("file", "rejections"));
    }
  }

  return winston.createLogger({
    level: logLevels[0],
    format: winston.format.combine(
      customFilter(),
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports,
    exceptionHandlers:
      exceptionHandlers.length > 0 ? exceptionHandlers : undefined,
    rejectionHandlers:
      rejectionHandlers.length > 0 ? rejectionHandlers : undefined,
  });
};

// Create logger instances for different purposes
const oeeLogger = createLogger("oee");
const errorLogger = createLogger("error");
const defaultLogger = createLogger();
const unplannedDowntimeLogger = createLogger("unplannedDowntime");

// Log initialization messages
oeeLogger.info("OEE Logger initialized successfully.");
errorLogger.info("Error Logger initialized successfully.");
defaultLogger.info("Default Logger initialized successfully.");
unplannedDowntimeLogger.info(
  "Unplanned Downtime Logger initialized successfully."
);

module.exports = {
  oeeLogger,
  errorLogger,
  defaultLogger,
  unplannedDowntimeLogger,
};

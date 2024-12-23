const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Laden der Umgebungsvariablen aus der .env-Datei
dotenv.config();

/**
 * Load log levels from environment variable or default to "info,debug,warn,error".
 * This allows for dynamic log level configuration from the .env file.
 * Log levels are read from the `LOG_LEVELS` environment variable.
 */
const logLevels = (process.env.LOG_LEVELS || "info,debug,warn,error").split(",").map(level => level.trim());
console.log("Log levels:", logLevels);

// Define the logging format used by winston for log messages
const logFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let logMessage = `${timestamp} ${level}: ${message}`;
    if (Object.keys(metadata).length) {
        logMessage += `\n${JSON.stringify(metadata, null, 2)}`;
    }
    return logMessage;
});

// Ensure that the logs directory exists
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Helper function to create a transport for logging (Console or File).
 * 
 * @param {string} type - Type of transport ('console' or 'file').
 * @param {string} [filename] - Filename for file transport.
 * @returns {Object|null} - Configured transport or null if not applicable.
 */
const createConsoleOrFileTransport = (type, filename) => {
    // Create console transport if logging to console is enabled in the environment
    if (type === "console" && process.env.LOG_TO_CONSOLE === "true") {
        return new winston.transports.Console({
            level: logLevels[0], // Use the first level in the log levels list (debug, info, etc.)
            format: winston.format.combine(
                winston.format.colorize(),  // Adds color to log levels
                winston.format.timestamp(), // Adds timestamp to each log
                logFormat                  // Custom format for log messages
            ),
        });
    }

    // Create file transport if logging to file is enabled in the environment
    if (type === "file" && process.env.LOG_TO_FILE === "true") {
        return new DailyRotateFile({
            filename: path.join(logsDir, `${filename}-%DATE%.log`),
            datePattern: "YYYY-MM-DD",    // Logs are rotated daily
            maxSize: "20m",               // Maximum file size of 20MB
            maxFiles: `${process.env.LOG_RETENTION_DAYS || 14}d`, // Retention of log files based on `LOG_RETENTION_DAYS`
            level: logLevels[0], // Use the first level in the log levels list (debug, info, etc.)
            format: winston.format.combine(
                winston.format.timestamp(),
                logFormat
            ),
        });
    }

    return null;
};

/**
 * Creates a new Winston logger with console and/or file transport.
 * 
 * @param {string} logFilename - The name of the log file (defaults to "app").
 * @returns {winston.Logger} - The Winston logger instance.
 */
const createNewLogger = (logFilename = "app") => {
    const transports = [];
    const exceptionHandlers = [];
    const rejectionHandlers = [];

    // Add console transport if configured
    const consoleTransport = createConsoleOrFileTransport("console");
    if (consoleTransport) {
        transports.push(consoleTransport);
    }

    // Add file transport if configured
    const fileTransport = createConsoleOrFileTransport("file", logFilename);
    if (fileTransport) {
        transports.push(fileTransport);
        exceptionHandlers.push(createConsoleOrFileTransport("file", "exceptions"));
        rejectionHandlers.push(createConsoleOrFileTransport("file", "rejections"));
    }

    // Fallback to console transport if no transport is configured
    if (transports.length === 0) {
        console.error(`No transports configured for logging. Enabling Console transport as fallback.`);
        transports.push(new winston.transports.Console({
            level: logLevels[0], // Use the first level in the log levels list (debug, info, etc.)
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp(),
                logFormat
            ),
        }));
    }

    return winston.createLogger({
        level: logLevels[0], // Use the first level in the log levels list (debug, info, etc.)
        format: winston.format.combine(
            winston.format.timestamp(),   // Add a timestamp to each log entry
            winston.format.json()         // Format log entries as JSON
        ),
        transports,
        exceptionHandlers: exceptionHandlers.length > 0 ? exceptionHandlers : undefined,
        rejectionHandlers: rejectionHandlers.length > 0 ? rejectionHandlers : undefined,
    });
};

// Create instances of different loggers for various purposes
const oeeLogger = createNewLogger("oee");
const errorLogger = createNewLogger("error");
const defaultLogger = createNewLogger();

// Log initialization messages for each logger instance
oeeLogger.info("OEE Logger initialized successfully.");
errorLogger.info("Error Logger initialized successfully.");
defaultLogger.info("Default Logger initialized successfully.");

// Export the loggers to be used in other parts of the application
module.exports = {
    oeeLogger,
    errorLogger,
    defaultLogger,
};
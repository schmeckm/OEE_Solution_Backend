const { InfluxDB } = require("@influxdata/influxdb-client");
const { defaultLogger, errorLogger } = require("../utils/logger");
const { influxdb } = require("../config/config");

// Variables to store the InfluxDB write and query APIs
let writeApi;
let queryApi;

/**
 * Initializes the InfluxDB client and sets up the write and query APIs.
 * Includes a retry mechanism for transient failures during initialization.
 *
 * @param {number} retryCount - The current retry attempt count (default: 0).
 */
function initializeInfluxDB(retryCount = 0) {
    const maxRetries = 3; // Maximum number of retry attempts
    const retryDelay = 5000; // Delay between retries in milliseconds (5 seconds)

    try {
        // Validate InfluxDB configuration
        if (!influxdb.url || !influxdb.token || !influxdb.org || !influxdb.bucket) {
            throw new Error("InfluxDB configuration is incomplete. Ensure 'url', 'token', 'org', and 'bucket' are provided.");
        }

        // Initialize the InfluxDB client
        const influxDB = new InfluxDB({ url: influxdb.url, token: influxdb.token });

        // Set up the write API for writing data to InfluxDB
        writeApi = influxDB.getWriteApi(influxdb.org, influxdb.bucket);

        // Set up the query API for querying data from InfluxDB
        queryApi = influxDB.getQueryApi(influxdb.org);

        defaultLogger.info("InfluxDB client initialized successfully.");
    } catch (error) {
        errorLogger.error(`InfluxDB initialization error: ${error.message}`);

        // Retry initialization if the maximum retry count is not reached
        if (retryCount < maxRetries) {
            errorLogger.warn(
                `Retrying InfluxDB initialization in ${retryDelay} ms (Attempt: ${retryCount + 1})...`
            );
            setTimeout(() => initializeInfluxDB(retryCount + 1), retryDelay);
        } else {
            errorLogger.error("Maximum retry attempts reached. Exiting process.");
            process.exit(1); // Exit the process if initialization fails after retries
        }
    }
}

/**
 * Retrieves the InfluxDB write API.
 * Throws an error if the API is not initialized.
 *
 * @returns {WriteApi} The InfluxDB write API instance.
 * @throws {Error} If the write API is not initialized.
 */
function getWriteApi() {
    if (!writeApi) {
        throw new Error("InfluxDB write API is not initialized. Call 'initializeInfluxDB()' first.");
    }
    return writeApi;
}

/**
 * Retrieves the InfluxDB query API.
 * Throws an error if the API is not initialized.
 *
 * @returns {QueryApi} The InfluxDB query API instance.
 * @throws {Error} If the query API is not initialized.
 */
function getQueryApi() {
    if (!queryApi) {
        throw new Error("InfluxDB query API is not initialized. Call 'initializeInfluxDB()' first.");
    }
    return queryApi;
}

/**
 * Flushes any remaining data to InfluxDB and logs the result.
 * Called during application shutdown to ensure no data loss.
 */
function shutdownInfluxDB() {
    if (writeApi) {
        defaultLogger.info("Flushing remaining InfluxDB data...");
        writeApi
            .flush()
            .then(() => defaultLogger.info("InfluxDB data flushed successfully."))
            .catch((error) =>
                errorLogger.error(`Error flushing InfluxDB data: ${error.message}`)
            );
    }
}

// Export functions for external use
module.exports = { initializeInfluxDB, getWriteApi, getQueryApi, shutdownInfluxDB };
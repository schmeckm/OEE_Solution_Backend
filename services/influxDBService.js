const { InfluxDB } = require("@influxdata/influxdb-client");
const { defaultLogger, errorLogger } = require("../utils/logger");
const { influxdb } = require("../config/config");

let writeApi;
let queryApi; // New variable to store the query API

/**
 * Initializes the InfluxDB client and sets up the write and query APIs.
 * Ensures that all necessary configurations are provided.
 */
function initializeInfluxDB(retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = 5000; // 5 seconds

    try {
        if (!influxdb.url || !influxdb.token || !influxdb.org || !influxdb.bucket) {
            throw new Error("InfluxDB configuration is incomplete.");
        }

        // Initialize the InfluxDB client
        const influxDB = new InfluxDB({ url: influxdb.url, token: influxdb.token });

        // Initialize the write API
        writeApi = influxDB.getWriteApi(influxdb.org, influxdb.bucket);

        // Initialize the query API
        queryApi = influxDB.getQueryApi(influxdb.org);

        defaultLogger.info("InfluxDB client initialized successfully.");
    } catch (error) {
        errorLogger.error(`InfluxDB initialization error: ${error.message}`);

        // Retry initialization up to maxRetries
        if (retryCount < maxRetries) {
            errorLogger.warn(
                `Retrying InfluxDB initialization in ${retryDelay} ms (Attempt: ${retryCount + 1})...`
            );
            setTimeout(() => initializeInfluxDB(retryCount + 1), retryDelay);
        } else {
            errorLogger.error("Maximum retry attempts reached. Exiting process.");
            process.exit(1); // Exit the process if InfluxDB cannot be initialized after retries
        }
    }
}

/**
 * Retrieves the InfluxDB write API.
 * Throws an error if the API is not initialized.
 */
function getWriteApi() {
    if (!writeApi) {
        throw new Error("InfluxDB write API is not initialized.");
    }
    return writeApi;
}

/**
 * Retrieves the InfluxDB query API.
 * Throws an error if the API is not initialized.
 */
function getQueryApi() {
    if (!queryApi) {
        throw new Error("InfluxDB query API is not initialized.");
    }
    return queryApi;
}

/**
 * Flush any remaining data to InfluxDB on application shutdown.
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

module.exports = { initializeInfluxDB, getWriteApi, getQueryApi, shutdownInfluxDB };
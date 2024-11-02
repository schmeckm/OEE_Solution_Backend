const { Point } = require("@influxdata/influxdb-client");
const { getWriteApi, getQueryApi } = require("./influxDBService");
const { oeeLogger, errorLogger } = require("../utils/logger");
const { influxdb } = require('../config/config'); // Correctly import the InfluxDB configuration
/**
 * Writes the OEE data to InfluxDB.
 * Uses InfluxDB's write API which should be initialized at application start.
 * @param {Object} metrics - The OEE metrics data to send to InfluxDB.
 */
async function writeOEEToInfluxDB(metrics) {
    try {
        console.log("Writing OEE to InfluxDB", metrics);

        const writeApi = getWriteApi(); // Retrieves the initialized InfluxDB write API

        const point = new Point("oee_metrics")
            .tag("plant", metrics.plant || "UnknownPlant")
            .tag("area", metrics.area || "UnknownArea")
            .tag("machineId", metrics.machineId || "UnknownMachine")
            .tag("ProcessOrderNumber", metrics.ProcessOrderNumber || "UnknownOrder")
            .tag("MaterialNumber", metrics.MaterialNumber || "UnknownMaterial")
            .tag("MaterialDescription", metrics.MaterialDescription || "No Description")
            .floatField("oee", metrics.oeeAsPercent ? metrics.oee : metrics.oee / 100 || 0)
            .floatField("availability", metrics.oeeAsPercent ? metrics.availability * 100 : metrics.availability || 0)
            .floatField("performance", metrics.oeeAsPercent ? metrics.performance * 100 : metrics.performance || 0)
            .floatField("quality", metrics.oeeAsPercent ? metrics.quality * 100 : metrics.quality || 0)
            .floatField("plannedProductionQuantity", metrics.plannedProductionQuantity || 0)
            .floatField("unplannedDowntime", metrics.totalUnplannedDowntime || 0);

        // Write the point to InfluxDB
        writeApi.writePoint(point);

        // Ensure that the point is flushed to the database
        await writeApi.flush();

        oeeLogger.info(
            `Successfully wrote OEE metrics for machine ID: ${metrics.machineId || "undefined"} to InfluxDB.`
        );
    } catch (error) {
        // Log the error and rethrow it for higher-level handling
        errorLogger.error(`Error writing to InfluxDB: ${error.message}`);
        throw error;
    }
}

/**
 * Reads OEE data from InfluxDB based on the given filters.
 * @param {Object} filters - The filters for querying OEE data.
 */
async function readOEEFromInfluxDB(filters) {
    try {
        const queryApi = getQueryApi(); // Retrieves the initialized InfluxDB query API

        // Use the bucket name from the configuration
        const bucket = influxdb.bucket || process.env.INFLUXDB_BUCKET;
        if (!bucket) {
            throw new Error("InfluxDB bucket name is not defined.");
        }

        let fluxQuery = `from(bucket: "${bucket}") |> range(start: -1y)`;

        // Add filters if they exist
        if (filters.plant) {
            fluxQuery += ` |> filter(fn: (r) => r["plant"] == "${filters.plant}")`;
        }
        if (filters.area) {
            fluxQuery += ` |> filter(fn: (r) => r["area"] == "${filters.area}")`;
        }
        if (filters.machineId) {
            fluxQuery += ` |> filter(fn: (r) => r["machineId"] == "${filters.machineId}")`;
        }
        if (filters.processOrder) {
            fluxQuery += ` |> filter(fn: (r) => r["ProcessOrderNumber"] == "${filters.processOrder}")`;
        }

        // Query data from InfluxDB
        const data = [];
        await queryApi.collectRows(fluxQuery, (row) => {
            data.push(row);
        });

        return data;
    } catch (error) {
        errorLogger.error(`Error reading from InfluxDB: ${error.message}`, error);
        throw error;
    }
}

module.exports = { writeOEEToInfluxDB, readOEEFromInfluxDB };
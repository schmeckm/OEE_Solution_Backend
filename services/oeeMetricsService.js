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
    const writeApi = getWriteApi(); // Retrieves the initialized InfluxDB write API
    oeeLogger.info(`Writing OEE metrics to InfluxDB: ${JSON.stringify(metrics)}`);

    const point = new Point("oee_metrics")
        .tag("plant", metrics.plant || "UnknownPlant")
        .tag("area", metrics.area || "UnknownArea")
        .tag("machineId", metrics.lineId || "UnknownMachine")
        .tag("ProcessOrderNumber", metrics.processordernumber || "UnknownOrder")
        .tag("MaterialNumber", metrics.materialnumber || "UnknownMaterial")
        .tag("MaterialDescription", metrics.materialdescription || "No Description")
        .floatField("oee", metrics.oee || 0)
        .floatField("availability", metrics.availability || 0)
        .floatField("performance", metrics.performance || 0)
        .floatField("quality", metrics.quality || 0)
        .floatField("plannedProductionQuantity", metrics.plannedproductionquantity || 0)
        .floatField("unplannedDowntime", metrics.totalUnplannedDowntime || 0);

    try {
        oeeLogger.info(`Writing points to InfluxDB: ${JSON.stringify(point)}`); 

        await writeApi.writePoint(point);
        await writeApi.close();
        oeeLogger.info(`Successfully wrote OEE metrics for machine ID: ${metrics.workcenter_id || "undefined"} to InfluxDB.`);
    } catch (error) {
        errorLogger.error(`Error writing to InfluxDB: ${error.message}`);
        throw error;
    }
}
/**
 * Reads OEE data from InfluxDB based on the given filters.
 * @param {Object} filters - The filters for querying OEE data.
 */
async function readOEEFromInfluxDB(filters) {
    oeeLogger.info(`Reading OEE data from InfluxDB with filters: ${JSON.stringify(filters)}`);
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
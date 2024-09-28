const { Point } = require("@influxdata/influxdb-client");
const { getWriteApi } = require("./influxDBService"); // Ensure this path is correct
const { oeeLogger, errorLogger } = require("../utils/logger");

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
      .tag(
        "MaterialDescription",
        metrics.MaterialDescription || "No Description"
      )

      // Ensure field values are provided, fallback to default if undefined
      .floatField(
        "oee",
        metrics.oeeAsPercent ? metrics.oee : metrics.oee / 100 || 0
      )
      .floatField(
        "availability",
        metrics.oeeAsPercent
          ? metrics.availability * 100
          : metrics.availability || 0
      )
      .floatField(
        "performance",
        metrics.oeeAsPercent
          ? metrics.performance * 100
          : metrics.performance || 0
      )
      .floatField(
        "quality",
        metrics.oeeAsPercent ? metrics.quality * 100 : metrics.quality || 0
      )
      .floatField(
        "plannedProductionQuantity",
        metrics.plannedProductionQuantity || 0
      )
      .floatField("unplannedDowntime", metrics.totalUnplannedDowntime || 0);

    // Write the point to InfluxDB
    writeApi.writePoint(point);

    // Ensure that the point is flushed to the database
    await writeApi.flush();

    oeeLogger.info(
      `Successfully wrote OEE metrics for machine ID: ${
        metrics.machineId || "undefined"
      } to InfluxDB.`
    );
  } catch (error) {
    // Log the error and rethrow it for higher-level handling
    errorLogger.error(`Error writing to InfluxDB: ${error.message}`);
    throw error;
  }
}

module.exports = { writeOEEToInfluxDB };

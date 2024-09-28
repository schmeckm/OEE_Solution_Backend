// microstopsService.js
const path = require("path");
const moment = require("moment");
const fs = require("fs").promises;
const { defaultLogger, errorLogger } = require("../utils/logger");

// Helper function to load JSON data from a file
const loadJsonFile = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    errorLogger.error(`Failed to load JSON file: ${filePath}`, {
      error: err.message,
    });
    throw err;
  }
};

/**
 * Aggregates microstop data by machine, filtered by machine ID and optional date range.
 * If no machine ID or date range is given, aggregates all microstop data.
 *
 * @param {string|null} machineId - The machine ID to filter by, or null to ignore.
 * @param {Date|null} startDate - The start date for filtering, or null to ignore start date.
 * @param {Date|null} endDate - The end date for filtering, or null to ignore end date.
 * @returns {Object} An object where the keys are reasons and the values are the aggregated differenz values, sorted by differenz in descending order.
 */
async function aggregateMicrostopsByMachine(
  machineId = null,
  startDate = null,
  endDate = null
) {
  const microstopsFilePath = path.resolve(__dirname, "../data/microstops.json");
  const microstops = await loadJsonFile(microstopsFilePath);

  // Filter microstops based on the provided machine ID and date range
  const filteredMicrostops = microstops.filter((ms) => {
    if (machineId && ms.machine_id !== machineId) return false;
    const msDate = moment(ms.Start);
    if (startDate && msDate.isBefore(moment(startDate))) return false;
    if (endDate && msDate.isAfter(moment(endDate))) return false;
    return true;
  });

  const aggregatedData = {};

  filteredMicrostops.forEach((ms) => {
    const machineKey = ms.machine_id;

    if (!aggregatedData[machineKey]) {
      aggregatedData[machineKey] = { microstops: [], total: 0 };
    }

    const reasonIndex = aggregatedData[machineKey].microstops.findIndex(
      (r) => r.reason === ms.Reason
    );

    if (reasonIndex >= 0) {
      // If reason already exists, increment the total for this reason
      aggregatedData[machineKey].microstops[reasonIndex].total += ms.Differenz;
    } else {
      // If reason does not exist, add a new entry with the reason code
      aggregatedData[machineKey].microstops.push({
        reason: ms.Reason,
        total: ms.Differenz,
      });
    }

    // Increment the overall total sum for the machine
    aggregatedData[machineKey].total += ms.Differenz;
  });

  return aggregatedData;
}

module.exports = { aggregateMicrostopsByMachine };

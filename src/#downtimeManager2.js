const fs = require("fs");
const path = require("path");
const moment = require("moment");
const { oeeLogger, errorLogger } = require("../utils/logger");
const { loadJsonData } = require("./dataService");

// Paths to JSON data files used in OEE calculations
const unplannedDowntimeFilePath = path.resolve(
  __dirname,
  "../data/unplannedDowntime.json"
);
const plannedDowntimeFilePath = path.resolve(
  __dirname,
  "../data/plannedDowntime.json"
);
const processOrderFilePath = path.resolve(
  __dirname,
  "../data/processOrder.json"
);
const shiftModelFilePath = path.resolve(__dirname, "../data/shiftModel.json");
const microstopFilePath = path.resolve(__dirname, "../data/microstops.json");

// Cache variables to store loaded data and avoid redundant file reads
let unplannedDowntimeCache = null;
let plannedDowntimeCache = null;
let processOrderDataCache = null;
let shiftModelDataCache = null;
let microstopCache = null;

// Invalidates all caches to force reloading data from files
function invalidateCache() {
  unplannedDowntimeCache = null;
  plannedDowntimeCache = null;
  processOrderDataCache = null;
  shiftModelDataCache = null;
  microstopCache = null;
}

// Loads and caches microstop data from the JSON file
function loadMicrostopData() {
  if (!microstopCache) {
    try {
      microstopCache = loadJsonData(microstopFilePath);
      if (!Array.isArray(microstopCache)) {
        oeeLogger.warn(
          `Expected an array in microstop.json but received: ${typeof microstopCache}`
        );
        microstopCache = [];
      } else if (microstopCache.length === 0) {
        oeeLogger.warn(`Microstop array is empty in ${microstopFilePath}`);
      } else {
        oeeLogger.debug(
          `Microstop data successfully loaded: ${JSON.stringify(
            microstopCache,
            null,
            2
          )}`
        );
      }
    } catch (error) {
      errorLogger.error(
        `Error reading or processing microstop.json: ${error.message}`
      );
      throw error;
    }
  }
  return microstopCache;
}

// Loads all JSON data files in parallel and caches the data
async function loadAllData() {
  try {
    const [
      unplannedDowntime,
      plannedDowntime,
      processOrders,
      shifts,
      microstops,
    ] = await Promise.all([
      loadJsonData(unplannedDowntimeFilePath),
      loadJsonData(plannedDowntimeFilePath),
      loadJsonData(processOrderFilePath),
      loadJsonData(shiftModelFilePath),
      loadJsonData(microstopFilePath),
    ]);

    unplannedDowntimeCache = unplannedDowntime;
    plannedDowntimeCache = plannedDowntime;
    processOrderDataCache = processOrders;
    shiftModelDataCache = shifts;
    microstopCache = microstops;

    oeeLogger.info("All data loaded and cached successfully.");
  } catch (error) {
    errorLogger.error(`Error loading data in parallel: ${error.message}`);
    throw error;
  }
}

// Loads unplanned downtime data if not already cached
function loadUnplannedDowntimeData() {
  if (!unplannedDowntimeCache) {
    unplannedDowntimeCache = loadJsonData(unplannedDowntimeFilePath);
  }
  return unplannedDowntimeCache;
}

// Loads planned downtime data if not already cached
function loadPlannedDowntimeData() {
  if (!plannedDowntimeCache) {
    plannedDowntimeCache = loadJsonData(plannedDowntimeFilePath);
  }
  return plannedDowntimeCache;
}

// Loads process order data if not already cached
function loadProcessOrderData() {
  if (!processOrderDataCache) {
    processOrderDataCache = loadJsonData(processOrderFilePath);
  }
  return processOrderDataCache;
}

// Loads shift model data if not already cached
function loadShiftModelData() {
  if (!shiftModelDataCache) {
    shiftModelDataCache = loadJsonData(shiftModelFilePath);
  }
  return shiftModelDataCache;
}

// Parses a date string to a Moment object in UTC
function parseDate(dateStr) {
  return moment.utc(dateStr);
}

// Filters data by machine ID and time range
function filterDataByTimeRange(dataArray, machineId, orderStart, orderEnd) {
  oeeLogger.debug(
    `Filtering data for machine ID: ${machineId} between ${orderStart} and ${orderEnd}`
  );

  return dataArray.filter((entry) => {
    const start = parseDate(entry.Start);
    const end = parseDate(entry.End);
    const isMatchingMachine = entry.machine_id === machineId;
    const isInRange =
      start.isBetween(orderStart, orderEnd, null, "[]") ||
      end.isBetween(orderStart, orderEnd, null, "[]");

    // Add detailed logging for each entry
    oeeLogger.debug(
      `  Machine Match: ${isMatchingMachine}, In Range: ${isInRange}`
    );

    return isMatchingMachine && isInRange;
  });
}

// Calculates the overlap duration between two time intervals
function calculateOverlap(start1, end1, start2, end2) {
  const overlapStart = moment.max(start1, start2);
  const overlapEnd = moment.min(end1, end2);
  return Math.max(0, overlapEnd.diff(overlapStart, "minutes"));
}

// Gets microstops filtered by machine ID and time range
function getMicrostops(machineId, processOrderStartTime, processOrderEndTime) {
  return filterDataByTimeRange(
    loadMicrostopData(),
    machineId,
    processOrderStartTime,
    processOrderEndTime
  );
}

// Gets planned downtime filtered by machine ID and time range
function getPlannedDowntime(
  machineId,
  processOrderStartTime,
  processOrderEndTime
) {
  return filterDataByTimeRange(
    loadPlannedDowntimeData(),
    machineId,
    processOrderStartTime,
    processOrderEndTime
  );
}

// Gets unplanned downtime filtered by machine ID and time range
function getUnplannedDowntime(
  machineId,
  processOrderStartTime,
  processOrderEndTime
) {
  return filterDataByTimeRange(
    loadUnplannedDowntimeData(),
    machineId,
    processOrderStartTime,
    processOrderEndTime
  );
}

// Calculates the duration of a break given its start and end time
function calculateBreakDuration(breakStart, breakEnd) {
  const breakStartTime = moment(breakStart, "HH:mm");
  const breakEndTime = moment(breakEnd, "HH:mm");
  return breakEndTime.diff(breakStartTime, "minutes");
}

// Filters and calculates durations for OEE calculation
function filterAndCalculateDurations(
  processOrder,
  plannedDowntime,
  unplannedDowntime,
  microstops,
  shifts
) {
  const orderStart = parseDate(processOrder.Start).startOf("hour");
  const orderEnd = parseDate(processOrder.End).endOf("hour");

  oeeLogger.debug(
    `Order Start: ${orderStart.format()}, Order End: ${orderEnd.format()}`
  );

  // Filter planned downtime entries
  const filteredPlannedDowntime = plannedDowntime.filter((downtime) => {
    const start = parseDate(downtime.Start);
    const end = parseDate(downtime.End);
    const isInRange =
      start.isBetween(orderStart, orderEnd, null, "[]") ||
      end.isBetween(orderStart, orderEnd, null, "[]");
    oeeLogger.debug(
      `Planned Downtime: Start: ${start.format()}, End: ${end.format()}, In Range: ${isInRange}`
    );
    return isInRange;
  });

  // Filter unplanned downtime entries
  const filteredUnplannedDowntime = unplannedDowntime.filter((downtime) => {
    const start = parseDate(downtime.Start);
    const end = parseDate(downtime.End);
    const isInRange =
      start.isBetween(orderStart, orderEnd, null, "[]") ||
      end.isBetween(orderStart, orderEnd, null, "[]");
    oeeLogger.debug(
      `Unplanned Downtime: Start: ${start.format()}, End: ${end.format()}, In Range: ${isInRange}`
    );
    return isInRange;
  });

  // Filter microstops
  const filteredMicrostops = microstops.filter((microstop) => {
    const start = parseDate(microstop.Start);
    const end = parseDate(microstop.End);
    const isInRange =
      start.isBetween(orderStart, orderEnd, null, "[]") ||
      end.isBetween(orderStart, orderEnd, null, "[]");
    oeeLogger.debug(
      `Microstop: Start: ${start.format()}, End: ${end.format()}, In Range: ${isInRange}`
    );
    return isInRange;
  });

  // Filter breaks
  const filteredBreaks = shifts.flatMap((shift) => {
    const shiftStart = moment.utc(
      `${moment(orderStart).format("YYYY-MM-DD")} ${shift.shift_start_time}`,
      "YYYY-MM-DD HH:mm"
    );
    const shiftEnd = moment.utc(
      `${moment(orderStart).format("YYYY-MM-DD")} ${shift.shift_end_time}`,
      "YYYY-MM-DD HH:mm"
    );
    const breakStart = moment.utc(
      `${moment(orderStart).format("YYYY-MM-DD")} ${shift.break_start}`,
      "YYYY-MM-DD HH:mm"
    );
    const breakEnd = moment.utc(
      `${moment(orderStart).format("YYYY-MM-DD")} ${shift.break_end}`,
      "YYYY-MM-DD HH:mm"
    );

    if (breakEnd.isBefore(breakStart)) {
      breakEnd.add(1, "day");
    }
    if (shiftEnd.isBefore(shiftStart)) {
      shiftEnd.add(1, "day");
    }

    oeeLogger.debug(
      `Shift ID: ${
        shift.shift_id
      }, Break Start: ${breakStart.format()}, Break End: ${breakEnd.format()}`
    );

    if (shift.machine_id === processOrder.machine_id) {
      return [
        {
          breakDuration: calculateBreakDuration(
            shift.break_start,
            shift.break_end
          ),
          breakStart: breakStart.format(),
          breakEnd: breakEnd.format(),
        },
      ];
    }
    return [];
  });

  return {
    plannedDowntime: filteredPlannedDowntime,
    unplannedDowntime: filteredUnplannedDowntime,
    microstops: filteredMicrostops,
    breaks: filteredBreaks,
  };
}

// Main function to load data and prepare OEE calculations
function loadDataAndPrepareOEE(machineId) {
  oeeLogger.debug(`Inside loadDataAndPrepareOEE with machineId: ${machineId}`);

  if (!machineId) {
    throw new Error("MachineId is required to load and prepare OEE data.");
  }

  try {
    const processOrders = loadProcessOrderData().filter((order) => {
      if (
        order.machine_id === machineId &&
        order.ProcessOrderStatus === "REL"
      ) {
        oeeLogger.debug(
          `Matching process order found: ${JSON.stringify(order)}`
        );
        return true;
      }
      return false;
    });

    if (processOrders.length === 0) {
      throw new Error(
        `No running process orders found for machineId: ${machineId}`
      );
    }

    const currentProcessOrder = processOrders[0];
    const processOrderStartTime = currentProcessOrder.Start;
    const processOrderEndTime = currentProcessOrder.End;

    oeeLogger.debug(
      `Current process order details: ${JSON.stringify(
        currentProcessOrder,
        null,
        2
      )}`
    );

    // Get and log the filtered unplanned downtime data
    const unplannedDowntime = getUnplannedDowntime(
      machineId,
      processOrderStartTime,
      processOrderEndTime
    );
    oeeLogger.debug(
      `Filtered unplanned downtime data: ${JSON.stringify(
        unplannedDowntime,
        null,
        2
      )}`
    );

    // Similar logging can be done for planned downtime and microstops if needed
    const plannedDowntime = getPlannedDowntime(
      machineId,
      processOrderStartTime,
      processOrderEndTime
    );
    const microstops = getMicrostops(
      machineId,
      processOrderStartTime,
      processOrderEndTime
    );
    const shifts = loadShiftModelData().filter(
      (shift) => shift.machine_id === machineId
    );

    oeeLogger.debug(`Filtered shifts: ${JSON.stringify(shifts, null, 2)}`);

    const durations = filterAndCalculateDurations(
      currentProcessOrder,
      plannedDowntime,
      unplannedDowntime,
      microstops,
      shifts
    );
    oeeLogger.debug(
      `Filtered durations: ${JSON.stringify(durations, null, 2)}`
    );

    const OEEData = {
      labels: [],
      datasets: [
        { label: "Production", data: [], backgroundColor: "green" },
        { label: "Break", data: [], backgroundColor: "blue" },
        { label: "Unplanned Downtime", data: [], backgroundColor: "red" },
        { label: "Planned Downtime", data: [], backgroundColor: "orange" },
        { label: "Microstops", data: [], backgroundColor: "purple" },
      ],
    };

    let currentTime = parseDate(currentProcessOrder.Start).startOf("hour");
    const orderEnd = parseDate(currentProcessOrder.End).endOf("hour");

    oeeLogger.debug(`Rounded order start time: ${currentTime.format()}`);
    oeeLogger.debug(`Rounded order end time: ${orderEnd.format()}`);

    while (currentTime.isBefore(orderEnd)) {
      const nextTime = currentTime.clone().add(1, "hour");

      if (OEEData.labels.includes(currentTime.toISOString())) {
        oeeLogger.warn(
          `Duplicate interval detected: ${currentTime.toISOString()} - Skipping this interval.`
        );
        currentTime = nextTime;
        continue;
      }

      OEEData.labels.push(currentTime.toISOString());

      let productionTime = nextTime.diff(currentTime, "minutes");
      let breakTime = 0;
      let unplannedDowntime = 0;
      let plannedDowntime = 0;
      let microstopTime = 0;

      durations.breaks.forEach((breakInfo) => {
        const breakStart = moment(breakInfo.breakStart);
        const breakEnd = moment(breakInfo.breakEnd);

        if (currentTime.isBefore(breakEnd) && nextTime.isAfter(breakStart)) {
          breakTime += calculateOverlap(
            currentTime,
            nextTime,
            breakStart,
            breakEnd
          );
        }
      });

      durations.unplannedDowntime.forEach((downtime) => {
        const downtimeStart = parseDate(downtime.Start);
        const downtimeEnd = parseDate(downtime.End);
        if (
          currentTime.isBefore(downtimeEnd) &&
          nextTime.isAfter(downtimeStart)
        ) {
          unplannedDowntime += calculateOverlap(
            currentTime,
            nextTime,
            downtimeStart,
            downtimeEnd
          );
        }
      });

      durations.plannedDowntime.forEach((downtime) => {
        const downtimeStart = parseDate(downtime.Start);
        const downtimeEnd = parseDate(downtime.End);
        if (
          currentTime.isBefore(downtimeEnd) &&
          nextTime.isAfter(downtimeStart)
        ) {
          plannedDowntime += calculateOverlap(
            currentTime,
            nextTime,
            downtimeStart,
            downtimeEnd
          );
        }
      });

      durations.microstops.forEach((microstop) => {
        const microstopStart = parseDate(microstop.Start);
        const microstopEnd = parseDate(microstop.End);
        if (
          currentTime.isBefore(microstopEnd) &&
          nextTime.isAfter(microstopStart)
        ) {
          microstopTime += calculateOverlap(
            currentTime,
            nextTime,
            microstopStart,
            microstopEnd
          );
        }
      });

      const totalNonProductionTime =
        breakTime + unplannedDowntime + plannedDowntime + microstopTime;
      productionTime = Math.max(0, productionTime - totalNonProductionTime);

      oeeLogger.debug(
        `Interval ${currentTime.format("HH:mm")} - ${nextTime.format("HH:mm")}:`
      );
      oeeLogger.debug(`  Production time: ${productionTime} minutes`);
      oeeLogger.debug(`  Break time: ${breakTime} minutes`);
      oeeLogger.debug(`  Unplanned downtime: ${unplannedDowntime} minutes`);
      oeeLogger.debug(`  Planned downtime: ${plannedDowntime} minutes`);
      oeeLogger.debug(`  Microstop time: ${microstopTime} minutes`);

      OEEData.datasets[0].data.push(productionTime);
      OEEData.datasets[1].data.push(breakTime);
      OEEData.datasets[2].data.push(unplannedDowntime);
      OEEData.datasets[3].data.push(plannedDowntime);
      OEEData.datasets[4].data.push(microstopTime);

      currentTime = nextTime;
    }

    oeeLogger.debug(`OEE Data: ${JSON.stringify(OEEData)}`);
    return OEEData;
  } catch (error) {
    errorLogger.error(`Error loading or preparing OEE data: ${error.message}`);
    throw error;
  }
}

// Export the functions for use in other modules
module.exports = {
  invalidateCache,
  loadAllData,
  getUnplannedDowntime,
  getPlannedDowntime,
  loadProcessOrderData,
  loadUnplannedDowntimeData,
  loadPlannedDowntimeData,
  loadShiftModelData,
  loadDataAndPrepareOEE,
  getMicrostops,
};

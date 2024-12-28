require('dotenv').config();  // Load .env file

const { dateSettings, oeeAsPercent } = require("../config/config");  // Import configuration containing environment variables
const {
    checkForRunningOrder,
    loadPlannedDowntimeData,
    loadUnplannedDowntimeData,
    loadMicrostops,
    loadShiftModelData,
    filterAndCalculateDurations,
} = require("../src/dataLoader");

const { oeeLogger, errorLogger } = require("../utils/logger");
const moment = require("moment-timezone");

// Access environment variables
const dateFormat = process.env.DATE_FORMAT;
const timezone = process.env.TIMEZONE;

console.log(`TIMEZONE: ${process.env.TIMEZONE}`);
console.log(`DATE_FORMAT: ${process.env.DATE_FORMAT}`);

// Cache for various data
const cache = {}; // Cache object to store data

/**
 * Loads data and prepares OEE (Overall Equipment Effectiveness) for a given machine.
 *
 * @async
 * @function loadDataAndPrepareOEE
 * @param {string} machineId - The ID of the machine for which to load and prepare OEE data.
 * @throws {Error} If the machineId is not provided or if no running process orders are found for the machine.
 * @returns {Promise<Object>} The prepared OEE data, including labels and datasets for production, breaks, and downtimes.
 *
 * @example
 * const oeeData = await loadDataAndPrepareOEE('machine123');
 * console.log(oeeData);
 */
async function loadDataAndPrepareOEE(machineId) {
    if (!machineId) {
        throw new Error("MachineId is required to load and prepare OEE data.");
    }

    // Check if data is already in the cache
    if (cache[machineId]) {
        return cache[machineId];
    }

    try {
        oeeLogger.debug("Debug:Function loadDataAndPrepareOEE ");
        oeeLogger.debug("-----------------------");
        oeeLogger.debug(`Checking for running order for machineId: ${machineId}`);
        const currentProcessOrder = await checkForRunningOrder(machineId);
        if (!currentProcessOrder) {
            throw new Error(
                `No running process orders found for machineId: ${machineId}`
            );
        }

        // Determine the start and end times of the process order in UTC
        const processOrderStartTime = moment.utc(currentProcessOrder.start_date);
        const processOrderEndTime = moment.utc(currentProcessOrder.end_date);
        oeeLogger.debug(`Process order start time: ${processOrderStartTime}`);
        oeeLogger.debug(`Process order end time: ${processOrderEndTime}`);
        oeeLogger.debug(`Current process order: ${JSON.stringify(currentProcessOrder)}`);
        
        const [
            plannedDowntimeData,
            unplannedDowntimeData,
            microstopsData,
            shiftModels, // shiftModels is correctly defined here
        ] = await Promise.all([
            loadPlannedDowntimeData(),
            loadUnplannedDowntimeData(),
            loadMicrostops(),
            loadShiftModelData(machineId), // shiftModels is correctly loaded here
        ]);

        // Filter Downtime Data function (for microstops, planned, and unplanned downtimes)
        const filterDowntimeData = (downtimeData) => {
            return downtimeData.filter((downtime) => {
                // Convert the start and end times of the downtime data to UTC
                const downtimeStart = moment.utc(downtime.start_date);
                const downtimeEnd = moment.utc(downtime.end_date);
             
                // Check if the workcenter matches
                const isWorkcenterMatch = downtime.workcenter_id && downtime.workcenter_id === machineId;
                
                const isAfterStartTime = downtimeEnd.isAfter(processOrderStartTime);  
                
                const isBeforeEndTime = downtimeStart.isBefore(processOrderEndTime); 
                
                const isValid = isWorkcenterMatch && isAfterStartTime && isBeforeEndTime;
                
                return isValid;
            });
        };

        const filteredPlannedDowntime = filterDowntimeData(plannedDowntimeData);
        const filteredUnplannedDowntime = filterDowntimeData(unplannedDowntimeData);
        const filteredMicrostops = filterDowntimeData(microstopsData);

        // Log the downtime data after filtering for debugging
        oeeLogger.debug(`Filtered Planned Downtime Data: ${JSON.stringify(filteredPlannedDowntime)}`);
        oeeLogger.debug(`Filtered Unplanned Downtime Data: ${JSON.stringify(filteredUnplannedDowntime)}`);
        oeeLogger.debug(`Filtered Microstops Data: ${JSON.stringify(filteredMicrostops)}`);

        // Calculate the durations for OEE calculations
        const durations = filterAndCalculateDurations(
            currentProcessOrder,
            filteredPlannedDowntime,
            filteredUnplannedDowntime,
            filteredMicrostops,
            shiftModels
        );

        // Log the durations for debugging
        oeeLogger.debug(`Durations for OEE calculations: ${JSON.stringify(durations)}`);

        // Build the OEEData object with labels and datasets for display in the frontend
        const OEEData = {
            labels: [],
            datasets: [
                { label: "Production", data: [], backgroundColor: "green" },
                { label: "Break", data: [], backgroundColor: "blue" },
                { label: "Unplanned Downtime", data: [], backgroundColor: "red" },
                { label: "Planned Downtime", data: [], backgroundColor: "orange" },
                { label: "Microstops", data: [], backgroundColor: "purple" },
            ],
            processOrder: currentProcessOrder, // Add the process order data
        };

        try {
            // Process the time intervals and assign the data
            let currentTime = moment(processOrderStartTime).startOf("hour");
            const orderEnd = moment(processOrderEndTime).endOf("hour");

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

                try {
                    // Calculate the various downtimes and breaks
                    calculateDowntimes(
                        filteredPlannedDowntime,
                        filteredUnplannedDowntime,
                        filteredMicrostops,
                        shiftModels, // shiftModels is correctly passed here
                        currentTime,
                        nextTime,
                        (planned, unplanned, microstops, breaks) => {
                            plannedDowntime += planned;
                            unplannedDowntime += unplanned;
                            microstopTime += microstops;
                            breakTime += breaks;
                        }
                    );
                } catch (error) {
                    oeeLogger.error(`Error calculating downtimes for interval ${currentTime.format("HH:mm")} - ${nextTime.format("HH:mm")}: ${error.message}`);
                    throw error;
                }

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

            // Store the data in the cache and return it
            cache[machineId] = OEEData;

            return OEEData;
        } catch (error) {
            errorLogger.error(
                `Error loading or preparing OEE data: ${error.message}`
            );
            throw error;
        }
    } catch (error) {
        errorLogger.error(
            `Error loading or preparing OEE data: ${error.message}`
        );
        throw error;
    }
}

/**
 * Calculates the various downtimes and breaks for a given time interval.
 *
 * @function calculateDowntimes
 * @param {Array} plannedDowntimes - Array of planned downtime objects.
 * @param {Array} unplannedDowntimes - Array of unplanned downtime objects.
 * @param {Array} microstops - Array of microstop objects.
 * @param {Array} shiftModels - Array of shift model objects.
 * @param {Object} currentTime - The current time moment object.
 * @param {Object} nextTime - The next time moment object.
 * @param {Function} callback - Callback function to return the calculated downtimes and breaks.
 */
function calculateDowntimes(
    plannedDowntimes,
    unplannedDowntimes,
    microstops,
    shiftModels, // shiftModels is correctly defined here
    currentTime,
    nextTime,
    callback
) {
    let plannedDowntime = 0;
    let unplannedDowntime = 0;
    let microstopTime = 0;
    let breakTime = 0;

    // Calculate planned downtimes
    plannedDowntimes.forEach((downtime) => {
        const downtimeStart = moment.utc(downtime.start_date);
        const downtimeEnd = moment.utc(downtime.end_date);
        if (currentTime.isBefore(downtimeEnd) && nextTime.isAfter(downtimeStart)) {
            plannedDowntime += calculateOverlap(currentTime, nextTime, downtimeStart, downtimeEnd);
        }
    });

    // Calculate unplanned downtimes
    unplannedDowntimes.forEach((downtime) => {
        const downtimeStart = moment.utc(downtime.start_date);
        const downtimeEnd = moment.utc(downtime.end_date);
        if (currentTime.isBefore(downtimeEnd) && nextTime.isAfter(downtimeStart)) {
            unplannedDowntime += calculateOverlap(currentTime, nextTime, downtimeStart, downtimeEnd);
        }
    });

    // Calculate microstops
    microstops.forEach((microstop) => {
        const microstopStart = moment.utc(microstop.start_date);
        const microstopEnd = moment.utc(microstop.end_date);
        if (currentTime.isBefore(microstopEnd) && nextTime.isAfter(microstopStart)) {
            microstopTime += calculateOverlap(currentTime, nextTime, microstopStart, microstopEnd);
        }
    });

    // Calculate breaks based on the shift model
    shiftModels.forEach((shift) => {
        const shiftStartDate = moment(currentTime).format("YYYY-MM-DD");
        const breakStart = moment.utc(
            `${shiftStartDate} ${shift.break_start}`,
            "YYYY-MM-DD HH:mm"
        );
        const breakEnd = moment.utc(
            `${shiftStartDate} ${shift.break_end}`,
            "YYYY-MM-DD HH:mm"
        );

        // Adjust for overnight shifts
        if (breakEnd.isBefore(breakStart)) {
            breakEnd.add(1, "day");
        }

        if (currentTime.isBefore(breakEnd) && nextTime.isAfter(breakStart)) {
            breakTime += calculateOverlap(
                currentTime,
                nextTime,
                breakStart,
                breakEnd
            );
        }
    });

    callback(plannedDowntime, unplannedDowntime, microstopTime, breakTime);
}

/**
 * Calculates the overlap duration between two time intervals.
 *
 * @function calculateOverlap
 * @param {Object} startTime - The start time moment object.
 * @param {Object} endTime - The end time moment object.
 * @param {Object} eventStart - The event start time moment object.
 * @param {Object} eventEnd - The event end time moment object.
 * @returns {number} The overlap duration in minutes.
 */
function calculateOverlap(startTime, endTime, eventStart, eventEnd) {
    const overlapStart = moment.max(startTime, eventStart);
    const overlapEnd = moment.min(endTime, eventEnd);
    return Math.max(0, overlapEnd.diff(overlapStart, "minutes"));
}

module.exports = {
    loadDataAndPrepareOEE,
};
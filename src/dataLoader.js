const axios = require("axios");
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const dotenv = require("dotenv");
const { oeeLogger, errorLogger } = require("../utils/logger");

dotenv.config();

const OEE_API_URL = process.env.OEE_API_URL;

// Erstellen der benutzerdefinierten axios-Instanz mit API-Key
const apiClient = axios.create({
    baseURL: OEE_API_URL,
    headers: {
        'x-api-key': process.env.API_KEY
    }
});

// Caches for various data
let unplannedDowntimeCache = null;
let plannedDowntimeCache = null;
let processOrderDataCache = null;
let shiftModelDataCache = null;
let machineDataCache = null;
let runningOrderCache = {};
let processOrderByMachineCache = {};
let microstopsCache = null;
let OEEDataCache = {};
const shiftModelCache = {};

// Load machine data from the API, caching the result
async function loadMachineData() {
    if (!machineDataCache) {
        try {
            const response = await apiClient.get(`/machines`);
            machineDataCache = response.data;
        } catch (error) {
            errorLogger.error(`Failed to load machine data: ${error.message}`);
            throw error;
        }
    }
    return machineDataCache;
}

// Load unplanned downtime data from the API, caching the result
async function loadUnplannedDowntimeData() {
    if (!unplannedDowntimeCache) {
        try {
            const response = await apiClient.get(`/unplanneddowntime`);
            const data = response.data;
            unplannedDowntimeCache = data.map((downtime) => ({
                ...downtime,
                Start: moment(downtime.Start).format("YYYY-MM-DDTHH:mm:ss.SSSZ"),
                End: moment(downtime.End).format("YYYY-MM-DDTHH:mm:ss.SSSZ"),
            }));
            oeeLogger.debug(`Unplanned downtime data loaded successfully.`);
        } catch (error) {
            errorLogger.error(`Failed to load unplanned downtime data: ${error.message}`);
            throw new Error("Could not load unplanned downtime data");
        }
    }
    return unplannedDowntimeCache;
}

// Load planned downtime data from the API, caching the result
async function loadPlannedDowntimeData() {
    if (!plannedDowntimeCache) {
        try {
            const response = await apiClient.get(`/planneddowntime`);
            const data = response.data;
            plannedDowntimeCache = data.map((downtime) => ({
                ...downtime,
                Start: moment(downtime.Start).format("YYYY-MM-DDTHH:mm:ss.SSSZ"),
                End: moment(downtime.End).format("YYYY-MM-DDTHH:mm:ss.SSSZ"),
            }));
            oeeLogger.info(`Planned downtime data loaded successfully.`);
        } catch (error) {
            errorLogger.error(`Failed to load planned downtime data: ${error.message}`);
            throw new Error("Could not load planned downtime data");
        }
    }
    return plannedDowntimeCache;
}

// Load process order data from the API, caching the result
async function loadProcessOrderData() {
    if (!processOrderDataCache) {
        try {
            const response = await apiClient.get(`/processorders`);
            if (!Array.isArray(response.data)) {
                throw new Error("Process order data is not an array");
            }
            let processOrderData = response.data.map((order) => ({
                ...order,
                Start: moment(order.Start).format("YYYY-MM-DDTHH:mm:ss.SSSZ"),
                End: moment(order.End).format("YYYY-MM-DDTHH:mm:ss.SSSZ"),
            }));
            processOrderDataCache = processOrderData;
            oeeLogger.debug(`Process order data loaded successfully.`);
        } catch (error) {
            errorLogger.error(`Failed to load process order data: ${error.message}`);
            throw new Error("Could not load process order data");
        }
    }
    return processOrderDataCache;
}

// Load process orders for a specific machine, caching the result
async function loadProcessOrderDataByMachine(machineId) {
    if (processOrderByMachineCache[machineId]) {
        oeeLogger.debug(`Returning cached process orders for machine ID: ${machineId}`);
        return processOrderByMachineCache[machineId];
    }
    try {
        const response = await apiClient.get(`/processorders/rel`, {
            params: { machineId, mark: true },
        });
        let processOrderData = response.data.map((order) => ({
            ...order,
            Start: moment(order.Start).format("YYYY-MM-DDTHH:mm:ss.SSSZ"),
            End: moment(order.End).format("YYYY-MM-DDTHH:mm:ss.SSSZ"),
        }));
        processOrderByMachineCache[machineId] = processOrderData;
        oeeLogger.info(`Process order data loaded successfully for machine ID: ${machineId}`);
        return processOrderData;
    } catch (error) {
        errorLogger.error(`Failed to load process order data for machine ID ${machineId}: ${error.message}`);
        throw new Error("Could not load process order data by machine");
    }
}

// Retrieve the machine ID using a line code, using cached data if available
async function getMachineIdFromLineCode(lineCode) {
    try {
        const machines = await loadMachineData();
        const machine = machines.find((m) => m.name === lineCode);
        if (machine) {
            oeeLogger.info(`Machine ID ${machine.machine_id} found for line code: ${lineCode}`);
            return machine.machine_id;
        } else {
            oeeLogger.warn(`No machine ID found for line code: ${lineCode}`);
            return null;
        }
    } catch (error) {
        errorLogger.error(`Failed to retrieve machine ID: ${error.message}`);
        throw new Error("Could not retrieve machine data");
    }
}

// Check for a running order for a specific machine, caching the result
async function checkForRunningOrder(machineId) {
    if (runningOrderCache[machineId]) {
        oeeLogger.debug(`Returning cached running order for machine ID: ${machineId}`);
        return runningOrderCache[machineId];
    }
    try {
        const response = await apiClient.get(`/processorders/rel`, {
            params: { machineId, mark: true },
        });
        const runningOrder = response.data;
        if (runningOrder && runningOrder.length > 0) {
            oeeLogger.info(`Running order found for machine ID: ${machineId}`);
            runningOrderCache[machineId] = runningOrder[0];
            return runningOrder[0];
        } else {
            oeeLogger.warn(`No running order found for machine ID: ${machineId}`);
            runningOrderCache[machineId] = null;
            return null;
        }
    } catch (error) {
        errorLogger.error(`Failed to check for running order: ${error.message}`);
        throw new Error("Could not retrieve process order data");
    }
}

// Load microstops data from the API, caching the result
async function loadMicrostops() {
    if (microstopsCache) {
        oeeLogger.debug("Returning cached microstops data");
        return microstopsCache;
    }
    try {
        const response = await apiClient.get(`/microstops`);
        if (Array.isArray(response.data)) {
            microstopsCache = response.data;
            oeeLogger.info("Microstops data loaded successfully.");
            return microstopsCache;
        } else {
            oeeLogger.warn("Unexpected format of microstops data");
            throw new Error("Invalid microstops data format");
        }
    } catch (error) {
        errorLogger.error(`Failed to load microstops data: ${error.message}`);
        throw new Error("Could not load microstops data");
    }
}

// Load and prepare OEE data
async function loadDataAndPrepareOEE(machineId) {
    if (OEEDataCache[machineId]) {
        oeeLogger.debug(`Returning cached OEE data for machine ID: ${machineId}`);
        return OEEDataCache[machineId];
    }
    try {
        const response = await apiClient.get(`/prepareOEE/oee/${machineId}`);
        const OEEData = response.data;
        oeeLogger.info(`OEE data loaded successfully for machine ID: ${machineId}`);
        oeeLogger.debug(`OEE data: ${JSON.stringify(OEEData, null, 2)}`);
        OEEDataCache[machineId] = OEEData;
        return OEEData;
    } catch (error) {
        errorLogger.error(`Failed to load OEE data for machine ID ${machineId}: ${error.message}`);
        throw new Error("Could not load OEE data from API");
    }
}

// Load shift model data for a specific machine from the API, caching the result
async function loadShiftModelData(machineId) {
    if (shiftModelCache[machineId]) {
        oeeLogger.debug(`Returning cached shift model data for machine ID: ${machineId}`);
        return shiftModelCache[machineId];
    }
    try {
        const response = await apiClient.get(`/shiftmodels/machine/${machineId}`);
        if (Array.isArray(response.data)) {
            shiftModelCache[machineId] = response.data;
            oeeLogger.debug(`Shift model data loaded successfully for machine ID: ${machineId}`);
            return shiftModelCache[machineId];
        } else {
            oeeLogger.warn(`Unexpected format of shift model data for machine ID: ${machineId}`);
            throw new Error("Invalid shift model data format");
        }
    } catch (error) {
        errorLogger.error(`Failed to load shift model data for machine ID: ${machineId}: ${error.message}`);
        throw new Error("Could not load shift model data");
    }
}

// Filters and calculates durations for OEE calculation
function filterAndCalculateDurations(processOrder, plannedDowntime, unplannedDowntime, microstops, shifts) {
    const orderStart = parseDate(processOrder.Start).startOf("hour");
    const orderEnd = parseDate(processOrder.End).endOf("hour");

    oeeLogger.debug(`Processing order from ${orderStart.format()} to ${orderEnd.format()}`);

    // Filter planned downtime entries
    const filteredPlannedDowntime = plannedDowntime.filter((downtime) => {
        const start = parseDate(downtime.Start);
        const end = parseDate(downtime.End);
        return start.isBetween(orderStart, orderEnd, null, "[]") || end.isBetween(orderStart, orderEnd, null, "[]");
    });

    // Filter unplanned downtime entries
    const filteredUnplannedDowntime = unplannedDowntime.filter((downtime) => {
        const start = parseDate(downtime.Start);
        const end = parseDate(downtime.End);
        return start.isBetween(orderStart, orderEnd, null, "[]") || end.isBetween(orderStart, orderEnd, null, "[]");
    });

    // Filter microstops
    const filteredMicrostops = microstops.filter((microstop) => {
        const start = parseDate(microstop.Start);
        const end = parseDate(microstop.End);
        return start.isBetween(orderStart, orderEnd, null, "[]") || end.isBetween(orderStart, orderEnd, null, "[]");
    });

    // Filter breaks based on shifts
    const filteredBreaks = shifts.flatMap((shift) => {
        const shiftStart = moment.utc(`${moment(orderStart).format("YYYY-MM-DD")} ${shift.shift_start_time}`, "YYYY-MM-DD HH:mm");
        const shiftEnd = moment.utc(`${moment(orderStart).format("YYYY-MM-DD")} ${shift.shift_end_time}`, "YYYY-MM-DD HH:mm");
        const breakStart = moment.utc(`${moment(orderStart).format("YYYY-MM-DD")} ${shift.break_start}`, "YYYY-MM-DD HH:mm");
        const breakEnd = moment.utc(`${moment(orderStart).format("YYYY-MM-DD")} ${shift.break_end}`, "YYYY-MM-DD HH:mm");

        if (breakEnd.isBefore(breakStart)) breakEnd.add(1, "day");
        if (shiftEnd.isBefore(shiftStart)) shiftEnd.add(1, "day");

        return shift.machine_id === processOrder.machine_id ? [{
            breakDuration: calculateBreakDuration(shift.break_start, shift.break_end),
            breakStart: breakStart.format(),
            breakEnd: breakEnd.format(),
        }] : [];
    });

    return {
        plannedDowntime: filteredPlannedDowntime,
        unplannedDowntime: filteredUnplannedDowntime,
        microstops: filteredMicrostops,
        breaks: filteredBreaks,
    };
}

// Helper function to parse date strings into Moment objects in UTC
function parseDate(dateStr) {
    return moment.utc(dateStr);
}

// Helper function to calculate the duration of a break
function calculateBreakDuration(breakStart, breakEnd) {
    const breakStartTime = moment(breakStart, "HH:mm");
    const breakEndTime = moment(breakEnd, "HH:mm");
    return breakEndTime.diff(breakStartTime, "minutes");
}

// Export all functions to be used in other modules
module.exports = {
    loadMachineData,
    loadUnplannedDowntimeData,
    loadMicrostops,
    loadPlannedDowntimeData,
    loadProcessOrderData,
    loadDataAndPrepareOEE,
    loadProcessOrderDataByMachine,
    getMachineIdFromLineCode,
    checkForRunningOrder,
    loadShiftModelData,
    filterAndCalculateDurations,
};
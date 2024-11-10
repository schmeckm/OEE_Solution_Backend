const axios = require("axios");
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const dotenv = require("dotenv");
const { oeeLogger, errorLogger } = require("../utils/logger");

dotenv.config();

const OEE_API_URL = process.env.OEE_API_URL;

// Erstellen der benutzerdefinierten axios-Instanz
const apiClient = axios.create({
    baseURL: OEE_API_URL,
    headers: {
        'x-api-key': process.env.API_KEY
    }
});

// Caches für verschiedene Daten
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

// Funktion zum Laden der Maschinendaten über apiClient
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

// Funktion zum Laden der ungeplanten Ausfallzeiten
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

// Funktion zum Laden der geplanten Ausfallzeiten
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

// Funktion zum Laden der Prozessauftragsdaten
async function loadProcessOrderData() {
    if (!processOrderDataCache) {
        try {
            const response = await apiClient.get(`/processorders`);

            if (!Array.isArray(response.data)) {
                throw new Error("Process order data is not an array");
            }

            let processOrderData = response.data;

            processOrderData = processOrderData.map((order) => ({
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

    if (!Array.isArray(processOrderDataCache)) {
        throw new Error("processOrderDataCache is not an array after loading");
    }

    return processOrderDataCache;
}

// Funktion zum Laden der Prozessaufträge für eine spezifische Maschine
async function loadProcessOrderDataByMachine(machineId) {
    if (processOrderByMachineCache[machineId]) {
        oeeLogger.debug(`Returning cached process orders for machine ID: ${machineId}`);
        return processOrderByMachineCache[machineId];
    }

    try {
        const response = await apiClient.get(`/processorders/rel?machineId=${machineId}&mark=true`);
        let processOrderData = response.data;

        processOrderData = processOrderData.map((order) => ({
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

// Funktion zum Laden von Microstops
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

// Funktion zum Laden und Vorbereiten der OEE-Daten
async function loadDataAndPrepareOEE(machineId) {
    if (OEEDataCache[machineId]) {
        oeeLogger.debug(`Returning cached OEE data for machine ID: ${machineId}`);
        return OEEDataCache[machineId];
    }

    try {
        const response = await apiClient.get(`/prepareOEE/oee/${machineId}`);

        if (!response.data || typeof response.data !== "object") {
            throw new Error("Invalid data returned from the API.");
        }

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

// Funktion zum Laden der Schichtmodelldaten für eine spezifische Maschine
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

// Hilfsfunktion zum Parsen von Datumsstrings
function parseDate(dateStr) {
    return moment.utc(dateStr);
}

// Helper function to calculate the duration of a break
function calculateBreakDuration(breakStart, breakEnd) {
    const breakStartTime = moment(breakStart, "HH:mm");
    const breakEndTime = moment(breakEnd, "HH:mm");
    return breakEndTime.diff(breakStartTime, "minutes");
}

// Export aller Funktionen
module.exports = {
    loadMachineData,
    loadUnplannedDowntimeData,
    loadMicrostops,
    loadPlannedDowntimeData,
    loadProcessOrderData,
    loadDataAndPrepareOEE,
    loadProcessOrderDataByMachine,
    loadShiftModelData
};
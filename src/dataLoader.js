const axios = require("axios");
const moment = require("moment-timezone");
const dotenv = require("dotenv");
const { oeeLogger, errorLogger, defaultLogger } = require("../utils/logger");

dotenv.config();

// Zugriff auf die Umgebungsvariablen
const dateFormat = process.env.DATE_FORMAT;
const timezone = process.env.TIMEZONE;

console.log(`TIMEZONE: ${process.env.TIMEZONE}`);
console.log(`DATE_FORMAT: ${process.env.DATE_FORMAT}`);

// Erstellen der benutzerdefinierten axios-Instanz mit API-Key
const OEE_API_URL = process.env.OEE_API_URL;
const API_KEY = process.env.API_KEY;

const apiClient = axios.create({
    baseURL: OEE_API_URL,
    headers: {
        'x-api-key': API_KEY
    }
});

// Caches for various data
const cache = {
    machineData: { data: null, lastFetchTime: null },
    unplannedDowntime: null,
    plannedDowntime: null,
    processOrderData: { data: null, lastFetchTime: null },
    shiftModelData: null,
    runningOrder: {},
    processOrderByMachine: {},
    microstops: null,
    OEEData: {},
    shiftModel: {}
};

// Helper function to check cache validity
const isCacheValid = (lastFetchTime) => lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION);

// Helper function to fetch data from API with caching
const fetchDataWithCache = async (cacheKey, endpoint, transformFn = (data) => data, options = {}) => {
    if (cache[cacheKey] && isCacheValid(cache[cacheKey].lastFetchTime)) {
        return cache[cacheKey].data;
    }
    try {
        const response = await apiClient.get(endpoint, options);
        if (!response || !response.data) {
            throw new Error(`No data received from API for endpoint: ${endpoint}`);
        }
        const data = transformFn(response.data);
        cache[cacheKey] = { data, lastFetchTime: Date.now() };
        return data;
    } catch (error) {
        errorLogger.error(`Failed to fetch ${cacheKey} data: ${error.message}`);
        throw new Error(`Could not load ${cacheKey} data`);
    }
};

// Load unplanned downtime data from the API, caching the result
const loadUnplannedDowntimeData = () => fetchDataWithCache('unplannedDowntime', '/unplanneddowntime', (data) => {
    oeeLogger.debug(`Fetched unplanned downtime data: ${JSON.stringify(data)}`);
    
    return data.map((downtime) => ({
        ...downtime,
        start_date: moment.utc(downtime.start_date).format(dateFormat), 
        end_date: moment.utc(downtime.end_date).format(dateFormat), 
    }));
});

// Load planned downtime data from the API, caching the result
const loadPlannedDowntimeData = () => fetchDataWithCache('plannedDowntime', '/planneddowntime', (data) => {
    oeeLogger.debug(`Fetched planned downtime data: ${JSON.stringify(data)}`);

    return data.map((downtime) => ({
        ...downtime,
        start_date: moment.utc(downtime.start_date).format(dateFormat), 
        end_date: moment.utc(downtime.end_date).format(dateFormat), 
    }));
});

// Load process order data from the API, caching the result
const loadProcessOrderData = () => fetchDataWithCache('processOrderData', '/processorders', (data) => {
    if (!Array.isArray(data)) {
        throw new Error("Process order data is not an array");
    }
    oeeLogger.debug(`Loaded ${data.length} process orders`);
    return data.map((order) => ({
        ...order,
        Start: moment.utc(order.start_date).format(dateFormat),
        End: moment.utc(order.end_date).format(dateFormat),
    }));
});

// Load process orders for a specific machine, caching the result
const loadProcessOrderDataByMachine = async (machineId) => {
    try {
        return await fetchDataWithCache(`processOrderByMachine.${machineId}`, `/processorders/rel`, (data) =>
            data.map((order) => ({
                ...order,
                Start: moment.utc(order.Start).format(dateFormat),
                End: moment.utc(order.End).format(dateFormat),
            })), { params: { machineId, mark: true } });
    } catch (error) {
        errorLogger.error(`Failed to load process orders for machine ID ${machineId}: ${error.message}`);
        throw new Error(`Could not load process orders for machine ID ${machineId}`);
    }
};

let cachedMachineData = null;
let lastFetchTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // Cache duration in milliseconds (e.g., 5 minutes)

async function loadMachineData() {
    const now = Date.now();

    // Check if cached data is available and not expired
    if (cachedMachineData && lastFetchTime && (now - lastFetchTime < CACHE_DURATION)) {
        return cachedMachineData;
    }

    try {
        const response = await apiClient.get('/workcenters');
        cachedMachineData = response.data;
        lastFetchTime = now;
        return cachedMachineData;
    } catch (error) {
        errorLogger.error(`Error fetching machine data: ${error.message}`, {
            stack: error.stack,
            config: error.config,
            response: error.response ? {
                status: error.response.status,
                data: error.response.data
            } : null
        });
        throw new Error(`Error fetching machine data: ${error.message}`);
    }
}

// Retrieve the machine ID using a line code, using cached data if available
const getMachineIdFromLineCode = async (machineName) => {
    try {
        const machines = await loadMachineData();
        const machine = machines.find((m) => {
            return m.name.toLowerCase() === machineName.toLowerCase();
        });

        if (machine) {
            oeeLogger.info(`Machine ID ${machine.workcenter_id} found for line code: ${machineName}`);
            return machine.workcenter_id;
        } else {
            oeeLogger.warn(`No machine ID found for line code: ${machineName}`);
            return null;
        }
    } catch (error) {
        errorLogger.error(`Failed to retrieve machine ID for line code ${machineName}: ${error.message}`);
        throw new Error(`Could not retrieve machine data for line code ${machineName}`);
    }
};

// Check for a running order for a specific machine, caching the result
const checkForRunningOrder = (machineId) => {
    oeeLogger.debug(`checkForRunningOrder called with machineId: ${machineId}`);

    return fetchDataWithCache(`runningOrder.${machineId}`, `/processorders/rel`, (data) => {
        oeeLogger.debug(`Data received for machine ID: ${machineId}`, data);

        if (data && data.length > 0) {
            oeeLogger.debug(`Running order found for machine ID: ${machineId}`, data[0]);
            return data[0];
        } else {
            oeeLogger.warn(`No running order found for machine ID: ${machineId}`);
            return null;
        }
    }, { params: { machineId, mark: true } })
    .catch(error => {
        oeeLogger.error(`Error fetching running order for machine ID: ${machineId}`, error);
        throw error;
    });
};

// Load and prepare OEE data
const loadDataAndPrepareOEE = async (machineId) => {
    try {
        const data = await fetchDataWithCache(`OEEData.${machineId}`, `/prepareOEE/oee/${machineId}`);
        return data;
    } catch (error) {
        errorLogger.error(`Failed to load and prepare OEE data for machineId ${machineId}: ${error.message}`);
        throw new Error(`Could not load and prepare OEE data for machineId ${machineId}`);
    }
};

// Fetch OEE Data from API with caching
const fetchOEEDataFromAPI = (machineId) => fetchDataWithCache(`OEEData.${machineId}`, `/prepareOEE/oee/${machineId}`, (data) => {
    return data;
});

// Load microstop data from the API, caching the result
const loadMicrostops = () => fetchDataWithCache('microstops', '/microstops', (data) => {
    // Flache Struktur der Microstops-Daten erstellen
    const flattenedMicrostops = data.map((microstop) => ({
        Microstop_ID: microstop.dataValues.Microstop_ID,
        Order_ID: microstop.dataValues.Order_ID,
        start_date: moment.utc(microstop.dataValues.start_date).format(dateFormat),
        end_date: moment.utc(microstop.dataValues.end_date).format(dateFormat),
        Reason: microstop.dataValues.Reason,
        Differenz: microstop.dataValues.Differenz,
        workcenter_id: microstop.dataValues.workcenter_id
    }));

    oeeLogger.debug(`Flattened Microstops Data: ${JSON.stringify(flattenedMicrostops)}`);
    return flattenedMicrostops;
});

// Load shift model data for a specific machine from the API, caching the result
const loadShiftModelData = (machineId) => fetchDataWithCache(`shiftModel.${machineId}`, `/shiftmodels/workcenter/${machineId}`, (data) => {
    oeeLogger.debug(`Fetched shift model data for machineId ${machineId}: ${JSON.stringify(data)}`);
    return data;
});

// Filters and calculates durations for OEE calculation
// Funktion zum Filtern und Berechnen der Dauern für die OEE-Berechnung
function filterAndCalculateDurations(processOrder, plannedDowntime, unplannedDowntime, microstops, shifts) {
    // Konvertiere start_date und end_date in Moment-Objekte und runde auf die nächste volle Stunde
    const orderStart = moment.utc(processOrder.start_date).startOf("hour");
    const orderEnd = moment.utc(processOrder.end_date).add(1, 'hour').startOf("hour");

    oeeLogger.debug(`Processing order from ${orderStart.format()} to ${orderEnd.format()}`);

    const filterEntries = (entries) => entries.filter(({ start_date, end_date }) => {
        const start = parseDate(start_date);
        const end = parseDate(end_date);
        return start.isBetween(orderStart, orderEnd, null, "[]") || end.isBetween(orderStart, orderEnd, null, "[]");
    });

    const filteredPlannedDowntime = filterEntries(plannedDowntime);
    oeeLogger.debug(`Filtered Planned Downtime: ${JSON.stringify(filteredPlannedDowntime)}`);

    const filteredUnplannedDowntime = filterEntries(unplannedDowntime);
    oeeLogger.debug(`Filtered Unplanned Downtime: ${JSON.stringify(filteredUnplannedDowntime)}`);

    const filteredMicrostops = filterEntries(microstops);
    oeeLogger.debug(`Filtered Microstops: ${JSON.stringify(filteredMicrostops)}`);

    // Gefilterte Pausen
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

        // Überprüfen, ob die Schicht innerhalb des Bestellzeitraums liegt
        if (shiftEnd.isBefore(orderStart) || shiftStart.isAfter(orderEnd)) {
            oeeLogger.debug(
                `Shift outside of order range: ${shift.shift_start_time} - ${shift.shift_end_time}`
            );
            return [];
        }

        // Berechnung der tatsächlichen Schichtzeiten innerhalb des Bestellzeitraums
        const actualShiftStart = moment.max(shiftStart, orderStart);
        const actualShiftEnd = moment.min(shiftEnd, orderEnd);

        const breakDuration = calculateBreakDuration(
            shift.break_start,
            shift.break_end
        );
        oeeLogger.debug(`Break Start: ${shift.break_start}, Break End: ${shift.break_end}`);
        oeeLogger.debug(`Calculated break duration: ${breakDuration} minutes`);

        const isMachineMatch = shift.workcenter_id === processOrder.workcenter_id;
        oeeLogger.debug(`Machine ID Match: ${isMachineMatch}`);

        return isMachineMatch ? [{
            breakDuration: breakDuration || 0, 
            breakStart: actualShiftStart.format(),
            breakEnd: actualShiftEnd.format(),
        }] : [];
    });

    oeeLogger.debug(`Filtered Breaks: ${JSON.stringify(filteredBreaks)}`);

    // Gesamt geplante Ausfallzeit berechnen
    const totalPlannedDowntime = filteredPlannedDowntime.reduce(
        (acc, downtime) => {
            const start = parseDate(downtime.start_date);
            const end = parseDate(downtime.end_date);
            acc += calculateOverlap(start, end, orderStart, orderEnd);
            return acc;
        },
        0
    );

    // Gesamt ungeplante Ausfallzeit berechnen
    const totalUnplannedDowntime = filteredUnplannedDowntime.reduce(
        (acc, downtime) => {
            const start = parseDate(downtime.start_date);
            const end = parseDate(downtime.end_date);
            acc += calculateOverlap(start, end, orderStart, orderEnd);
            return acc;
        },
        0
    );

    // Gesamt Mikrostopps berechnen
    const totalMicrostops = filteredMicrostops.length;
    const totalMicrostopDuration = filteredMicrostops.reduce((acc, microstop) => {
        const start = parseDate(microstop.start_date);
        const end = parseDate(microstop.end_date);
        acc += calculateOverlap(start, end, orderStart, orderEnd);
        return acc;
    }, 0);

    // Gesamt Pausen berechnen
    const totalBreakDuration = filteredBreaks.reduce(
        (acc, brk) => acc + (brk.breakDuration || 0),
        0
    );

    oeeLogger.debug(`Total Planned Downtime: ${totalPlannedDowntime} minutes`);
    oeeLogger.debug(
        `Total Unplanned Downtime: ${totalUnplannedDowntime} minutes`
    );
    oeeLogger.debug(
        `Total Microstops: ${totalMicrostops}, Duration: ${totalMicrostopDuration} minutes`
    );
    oeeLogger.debug(`Total Break Duration: ${totalBreakDuration} minutes`);

    return {
        plannedDowntime: totalPlannedDowntime,
        unplannedDowntime: totalUnplannedDowntime,
        microstops: totalMicrostops,
        microstopDuration: totalMicrostopDuration,
        breaks: totalBreakDuration, // Rückgabe der gesamten Pausendauer
    };
}

// Helper function to parse date strings into Moment objects in UTC
function parseDate(dateStr) {
    return moment.utc(dateStr);
}

// Helper function to calculate the overlap duration between two time intervals
function calculateOverlap(start1, end1, start2, end2) {
    const overlapStart = moment.max(start1, start2);
    const overlapEnd = moment.min(end1, end2);
    return Math.max(0, overlapEnd.diff(overlapStart, "minutes"));
}

// Helper function to calculate the duration of a break
function calculateBreakDuration(breakStart, breakEnd) {
    // Konvertieren der Zeiten zu Moment-Objekten in UTC
    const format = "YYYY-MM-DDTHH:mm:ssZ"; // Angenommen, Ihre Zeiten sind in diesem Format
    const breakStartTime = moment.utc(breakStart, format);
    const breakEndTime = moment.utc(breakEnd, format);

    // Überprüfung, ob die Endzeit vor der Startzeit liegt (Über Nacht)
    if (breakEndTime.isBefore(breakStartTime)) {
        breakEndTime.add(1, 'day');
    }

    // Berechnen der Dauer in Minuten
    const duration = breakEndTime.diff(breakStartTime, 'minutes');
    return duration;
}

// Export all functions to be used in other modules
module.exports = {
    loadMachineData,
    loadUnplannedDowntimeData,
    loadMicrostops,
    loadPlannedDowntimeData,
    fetchOEEDataFromAPI,
    getMachineIdFromLineCode,
    loadProcessOrderData,
    loadDataAndPrepareOEE,
    loadProcessOrderDataByMachine,
    checkForRunningOrder,
    loadShiftModelData,
    filterAndCalculateDurations,
};
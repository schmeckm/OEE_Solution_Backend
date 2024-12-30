const {
    axios,
    moment,
    dotenv,
    oeeLogger,
    errorLogger,
    defaultLogger,
    OEE_API_URL,
    DATE_FORMAT,
    TIMEZONE,
    apiClient
} = require("./header");

dotenv.config();

// Access environment variables
console.log(`TIMEZONE: ${TIMEZONE}`);

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

const CACHE_DURATION = 5 * 60 * 1000; // Cache duration in milliseconds (e.g., 5 minutes)

// Helper function to check cache validity
const isCacheValid = (lastFetchTime) => lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION);

// Helper function to fetch data from API with caching
const fetchDataWithCache = async (cacheKey, endpoint, transformFn = (data) => data, options = {}) => {
    if (cache[cacheKey] && isCacheValid(cache[cacheKey].lastFetchTime)) {
        return cache[cacheKey].data;
    }
    try {
        const response = await apiClient.get(endpoint, options);
        if (!response?.data) {
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

// Funktion zum Invalidieren des Caches
const invalidateCache = (cacheKey) => {
    if (cacheKey) {
        delete cache[cacheKey];
    } else {
        // Invalidate all cache
        Object.keys(cache).forEach(key => {
            cache[key] = null;
        });
    }
};

// Generic function to load downtime data
const loadDowntimeData = (cacheKey, endpoint) => fetchDataWithCache(cacheKey, endpoint, (data) => {
    oeeLogger.debug(`Fetched ${cacheKey} data: ${JSON.stringify(data)}`);
    return data.map((downtime) => ({
        ...downtime,
        start_date: moment.utc(downtime.start_date).format(DATE_FORMAT),
        end_date: moment.utc(downtime.end_date).format(DATE_FORMAT),
    }));
});

const getPlantAndArea = (machineId) => fetchDataWithCache(`plantAndArea.${machineId}`, `/workcenters/${machineId}`, (data) => {
    if (!data) {
        oeeLogger.warn(`No data returned for machineId ${machineId}`);
    }
    return {
        plant: data?.plant || UNKNOWN_VALUES.PLANT,
        area: data?.area || UNKNOWN_VALUES.AREA,
        lineId: data?.name || UNKNOWN_VALUES.LINE,
    };
}).catch(error => {
    errorLogger.error(`Error retrieving plant and area for machineId ${machineId}: ${error.message}`);
    return { plant: UNKNOWN_VALUES.PLANT, area: UNKNOWN_VALUES.AREA, lineId: UNKNOWN_VALUES.LINE };
});



// Load unplanned downtime data from the API, caching the result
const loadUnplannedDowntimeData = () => loadDowntimeData('unplannedDowntime', '/unplanneddowntime');

// Load planned downtime data from the API, caching the result
const loadPlannedDowntimeData = () => loadDowntimeData('plannedDowntime', '/planneddowntime');

// Load process order data from the API, caching the result
const loadProcessOrderData = () => fetchDataWithCache('processOrderData', '/processorders', (data) => {
    if (!Array.isArray(data)) {
        throw new Error("Process order data is not an array");
    }
    oeeLogger.debug(`Loaded ${data.length} process orders`);
    return data.map((order) => ({
        ...order,
        Start: moment.utc(order.start_date).format(DATE_FORMAT),
        End: moment.utc(order.end_date).format(DATE_FORMAT),
    }));
});

// Load process orders for a specific machine, caching the result
const loadProcessOrderDataByMachine = (machineId) => fetchDataWithCache(`processOrderByMachine.${machineId}`, `/processorders/rel`, (data) =>
    data.map((order) => ({
        ...order,
        Start: moment.utc(order.Start).format(DATE_FORMAT),
        End: moment.utc(order.End).format(DATE_FORMAT),
    })), { params: { machineId, mark: true } });

async function loadMachineData() {
    const now = Date.now();
    if (cache.machineData.data && isCacheValid(cache.machineData.lastFetchTime)) {
        return cache.machineData.data;
    }
    try {
        const response = await apiClient.get('/workcenters');
        cache.machineData = { data: response.data, lastFetchTime: now };
        return response.data;
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
        const machine = machines.find((m) => m.name.toLowerCase() === machineName.toLowerCase());
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
const checkForRunningOrder = (machineId) => fetchDataWithCache(`runningOrder.${machineId}`, `/processorders/rel`, (data) => {
    oeeLogger.debug(`Data received for machine ID: ${machineId}`, data);
    if (data && data.length > 0) {
        oeeLogger.debug(`Running order found for machine ID: ${machineId}`, data[0]);
        return data[0];
    } else {
        oeeLogger.warn(`No running order found for machine ID: ${machineId}`);
        return null;
    }
}, { params: { machineId, mark: true } }).catch(error => {
    oeeLogger.error(`Error fetching running order for machine ID: ${machineId}`, error);
    throw error;
});

// Load and prepare OEE data
const loadDataAndPrepareOEE = (machineId) => fetchDataWithCache(`OEEData.${machineId}`, `/prepareOEE/oee/${machineId}`).catch(error => {
    errorLogger.error(`Failed to load and prepare OEE data for machineId ${machineId}: ${error.message}`);
    throw new Error(`Could not load and prepare OEE data for machineId ${machineId}`);
});

// Load microstop data from the API, caching the result
const loadMicrostops = () => fetchDataWithCache('microstops', '/microstops', (data) => {
    const flattenedMicrostops = data.map((microstop) => ({
        Microstop_ID: microstop.Microstop_ID,
        Order_ID: microstop.Order_ID,
        start_date: moment.utc(microstop.start_date).format(DATE_FORMAT),
        end_date: moment.utc(microstop.end_date).format(DATE_FORMAT),
        Reason: microstop.Reason,
        Differenz: microstop.Differenz,
        workcenter_id: microstop.workcenter_id
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
/**
 * Filters and calculates various durations related to a process order.
 *
 * @param {Object} processOrder - The process order object.
 * @param {string} processOrder.start_date - The start date of the process order.
 * @param {string} processOrder.end_date - The end date of the process order.
 * @param {string} processOrder.workcenter_id - The workcenter ID of the process order.
 * @param {Array<Object>} plannedDowntime - Array of planned downtime entries.
 * @param {string} plannedDowntime[].start_date - The start date of the planned downtime.
 * @param {string} plannedDowntime[].end_date - The end date of the planned downtime.
 * @param {Array<Object>} unplannedDowntime - Array of unplanned downtime entries.
 * @param {string} unplannedDowntime[].start_date - The start date of the unplanned downtime.
 * @param {string} unplannedDowntime[].end_date - The end date of the unplanned downtime.
 * @param {Array<Object>} microstops - Array of microstop entries.
 * @param {string} microstops[].start_date - The start date of the microstop.
 * @param {string} microstops[].end_date - The end date of the microstop.
 * @param {Array<Object>} shifts - Array of shift entries.
 * @param {string} shifts[].shift_start_time - The start time of the shift.
 * @param {string} shifts[].shift_end_time - The end time of the shift.
 * @param {string} shifts[].break_start - The start time of the break.
 * @param {string} shifts[].break_end - The end time of the break.
 * @param {string} shifts[].workcenter_id - The workcenter ID of the shift.
 * @returns {Object} An object containing the calculated durations.
 * @returns {number} returns.plannedDowntime - Total planned downtime in minutes.
 * @returns {number} returns.unplannedDowntime - Total unplanned downtime in minutes.
 * @returns {number} returns.microstops - Total number of microstops.
 * @returns {number} returns.microstopDuration - Total duration of microstops in minutes.
 * @returns {number} returns.breaks - Total break duration in minutes.
 */
function filterAndCalculateDurations(processOrder, plannedDowntime, unplannedDowntime, microstops, shifts) {
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

    const filteredBreaks = shifts.flatMap((shift) => {
        const shiftStart = moment.utc(`${moment(orderStart).format("YYYY-MM-DD")} ${shift.shift_start_time}`, "YYYY-MM-DD HH:mm");
        const shiftEnd = moment.utc(`${moment(orderStart).format("YYYY-MM-DD")} ${shift.shift_end_time}`, "YYYY-MM-DD HH:mm");
        const breakStart = moment.utc(`${moment(orderStart).format("YYYY-MM-DD")} ${shift.break_start}`, "YYYY-MM-DD HH:mm");
        const breakEnd = moment.utc(`${moment(orderStart).format("YYYY-MM-DD")} ${shift.break_end}`, "YYYY-MM-DD HH:mm");

        if (breakEnd.isBefore(breakStart)) {
            breakEnd.add(1, "day");
        }
        if (shiftEnd.isBefore(shiftStart)) {
            shiftEnd.add(1, "day");
        }

        if (shiftEnd.isBefore(orderStart) || shiftStart.isAfter(orderEnd)) {
            oeeLogger.debug(`Shift outside of order range: ${shift.shift_start_time} - ${shift.shift_end_time}`);
            return [];
        }

        const actualShiftStart = moment.max(shiftStart, orderStart);
        const actualShiftEnd = moment.min(shiftEnd, orderEnd);

        const breakDuration = calculateBreakDuration(shift.break_start, shift.break_end);
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

    const totalPlannedDowntime = filteredPlannedDowntime.reduce((acc, downtime) => {
        const start = parseDate(downtime.start_date);
        const end = parseDate(downtime.end_date);
        acc += calculateOverlap(start, end, orderStart, orderEnd);
        return acc;
    }, 0);

    const totalUnplannedDowntime = filteredUnplannedDowntime.reduce((acc, downtime) => {
        const start = parseDate(downtime.start_date);
        const end = parseDate(downtime.end_date);
        acc += calculateOverlap(start, end, orderStart, orderEnd);
        return acc;
    }, 0);

    const totalMicrostops = filteredMicrostops.length;
    const totalMicrostopDuration = filteredMicrostops.reduce((acc, microstop) => {
        const start = parseDate(microstop.start_date);
        const end = parseDate(microstop.end_date);
        acc += calculateOverlap(start, end, orderStart, orderEnd);
        return acc;
    }, 0);

    const totalBreakDuration = filteredBreaks.reduce((acc, brk) => acc + (brk.breakDuration || 0), 0);

    oeeLogger.debug(`Total Planned Downtime: ${totalPlannedDowntime} minutes`);
    oeeLogger.debug(`Total Unplanned Downtime: ${totalUnplannedDowntime} minutes`);
    oeeLogger.debug(`Total Microstops: ${totalMicrostops}, Duration: ${totalMicrostopDuration} minutes`);
    oeeLogger.debug(`Total Break Duration: ${totalBreakDuration} minutes`);

    return {
        plannedDowntime: totalPlannedDowntime,
        unplannedDowntime: totalUnplannedDowntime,
        microstops: totalMicrostops,
        microstopDuration: totalMicrostopDuration,
        breaks: totalBreakDuration,
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
    const format = "YYYY-MM-DDTHH:mm:ssZ";
    const breakStartTime = moment.utc(breakStart, format);
    const breakEndTime = moment.utc(breakEnd, format);

    if (breakEndTime.isBefore(breakStartTime)) {
        breakEndTime.add(1, 'day');
    }

    return breakEndTime.diff(breakStartTime, 'minutes');
}

// Export all functions to be used in other modules
module.exports = {
    loadMachineData,
    loadUnplannedDowntimeData,
    loadMicrostops,
    getPlantAndArea,
    loadPlannedDowntimeData,
    getMachineIdFromLineCode,
    loadProcessOrderData,
    loadDataAndPrepareOEE,
    loadProcessOrderDataByMachine,
    checkForRunningOrder,
    loadShiftModelData,
    filterAndCalculateDurations,
    invalidateCache, // Neue Funktion exportieren
};
const {
    oeeLogger,
    errorLogger,
    axios,
    moment,
    DATE_FORMAT,
    TIMEZONE,
    apiClient
} = require("./header");

const { sendWebSocketMessage } = require("../websocket/webSocketUtils");
const { influxdb } = require("../config/config");
const { loadMachineData, loadDataAndPrepareOEE, loadProcessOrderDataByMachine, getPlantAndArea } = require("./dataLoader");
const OEECalculator = require("./oeeCalculator");

require('dotenv').config(); // Load environment variables

// Access environment variables
const dateFormat = DATE_FORMAT;
const timezone = TIMEZONE;

const UNKNOWN_VALUES = { PLANT: 'UnknownPlant', AREA: 'UnknownArea', LINE: 'UnknownLine' };
const oeeCalculators = new Map();
let metricBuffers = new Map();
let logCallCount = 0;

function logTabularData(metrics) {
    const {
        lineId = UNKNOWN_VALUES.LINE,
        oee = 0,
        availability = 0,
        performance = 0,
        quality = 0,
        plannedproductionquantity = 0,
        ActualProductionQuantity = 0,
        ActualProductionYield = 0,
        plannedDurationMinutes = 0,
        plannedTakt = 0,
        actualTakt = 0,
        setuptime = 0,
        teardowntime = 0,
        classification = "N/A"
    } = metrics;

    logCallCount++;
    oeeLogger.info(`Call number: ${logCallCount}`);
    oeeLogger.info(`\n--- OEE Metrics for Machine: ${lineId} ---`);

    // Ensure that variables are not null or undefined
    const safeLineId = lineId || "Unknown";
    const safeClassification = classification || "N/A";

    // Ensure that numeric values are not null or undefined
    const safeAvailability = availability !== null && availability !== undefined ? availability : 0;
    const safePerformance = performance !== null && performance !== undefined ? performance : 0;
    const safeQuality = quality !== null && quality !== undefined ? quality : 0;
    const safeOee = oee !== null && oee !== undefined ? oee : 0;
    const safePlannedTakt = plannedTakt !== null && plannedTakt !== undefined ? plannedTakt : 0;
    const safeActualTakt = actualTakt !== null && actualTakt !== undefined ? actualTakt : 0;

    oeeLogger.info(`
  +-----------------------------------------------+-------------------+
  | Metric                                        | Value             |
  +-----------------------------------------------+-------------------+
  | Machine                                       | ${safeLineId.padEnd(2)}          |
  | Availability (%)                              | ${safeAvailability.toFixed(2).padStart(6)}%           |
  | Performance (%)                               | ${safePerformance.toFixed(2).padStart(6)}%           |
  | Quality (%)                                   | ${safeQuality.toFixed(2).padStart(6)}%           |
  | OEE (%)                                       | ${safeOee.toFixed(2).padStart(6)}%           |
  | Classification                                | ${safeClassification.padEnd(2)}     |
  | Planned Production Quantity                   | ${plannedproductionquantity.toString().padStart(6)}            |
  | Actual Production Quantity                    | ${ActualProductionQuantity.toString().padStart(6)}            |
  | Actual Yield Quantity                         | ${ActualProductionYield.toString().padStart(6)}            |
  | Production Time (Min)                         | ${plannedDurationMinutes.toString().padStart(6)}            |
  | Setup Time (Min)                              | ${setuptime.toString().padStart(6)}            |
  | Teardown Time (Min)                           | ${teardowntime.toString().padStart(6)}            |
  | Planned Takt (Min/unit)                       | ${safePlannedTakt.toFixed(2).padStart(6)}            |
  | Actual Takt (Min/unit)                        | ${safeActualTakt.toFixed(2).padStart(6)}            |
  +-----------------------------------------------+-------------------+
  `);
}

async function updateMetric(name, value, machineId) {
    try {
        if (!metricBuffers.has(machineId)) metricBuffers.set(machineId, {});
        oeeLogger.info("Debug:Function updateMetric ");
        oeeLogger.info("-----------------------");
        const buffer = metricBuffers.get(machineId);
        oeeLogger.info(`Buffer:"${JSON.stringify(buffer)}"`);
        buffer[name] = value;
        await processMetrics(machineId, buffer);
        oeeLogger.info(`Updating metric ${name} for machineId ${machineId} with value: ${value}`);
        logMetricBuffer();
    } catch (error) {
        errorLogger.error(`Error updating metric ${name} for machineId ${machineId}: ${error.message}`);
    }
}

/**
 * Processes OEE metrics for a given machine.
 *
 * @async
 * @function processMetrics
 * @param {string} machineId - The ID of the machine to process metrics for.
 * @param {Object} buffer - The buffer containing production data.
 * @param {number} [buffer.ActualProductionQuantity=0] - The actual production quantity.
 * @param {number} [buffer.ActualProductionYield=0] - The actual production yield.
 * @throws {Error} Throws an error if initialization or metric calculation fails.
 * @returns {Promise<void>}
 *
 * @example
 * const machineId = 'machine123';
 * const buffer = { ActualProductionQuantity: 100, ActualProductionYield: 95 };
 * await processMetrics(machineId, buffer);
 */
async function processMetrics(machineId, buffer) {
    try {
        let calculator = oeeCalculators.get(machineId) || new OEECalculator();
        oeeLogger.debug("Debug:Function ProcessMetrics ");
        oeeLogger.debug("-----------------------");
        oeeLogger.debug(`Retrieved calculator for machineId ${machineId}`);
        if (!oeeCalculators.has(machineId)) {
            oeeLogger.debug(`Initializing OEE calculator for machineId ${machineId}`);
            const initResult = await calculator.init(machineId);
            if (initResult) {
                oeeCalculators.set(machineId, calculator);
                oeeLogger.debug(`OEE calculator initialized and set for machineId ${machineId}`);
            } else {
                oeeLogger.error(`Failed to initialize OEE calculator for machineId ${machineId}`);
                throw new Error(`Initialization failed for machineId ${machineId}`);
            }
        }

        const { plant, area, lineId } = await getPlantAndArea(machineId);

        oeeLogger.info(`Plant: ${plant}, Area: ${area}, Line: ${lineId}`);

        calculator.oeeData[machineId] = { ...calculator.oeeData[machineId], plant, area, lineId, ...buffer };
        
        const processOrderData = await loadProcessOrderDataByMachine(machineId);
        
        if (!processOrderData || processOrderData.length === 0) throw new Error(`No active process order found for machine ${machineId}`);
        const processOrder = processOrderData[0];
        let OEEData;        
        try {
            OEEData = await loadDataAndPrepareOEE(machineId);
            validateOEEData(OEEData);
        } catch (error) {
            throw new Error(`Could not load shift model data: ${error.message}`);
        }
        const totalTimes = calculateTotalTimes(OEEData.datasets);
        validateInputData(totalTimes, machineId);
        const ActualProductionQuantity = buffer?.ActualProductionQuantity || 0;
        const ActualProductionYield = buffer?.ActualProductionYield || 0;
        await calculator.calculateMetrics(machineId, totalTimes.unplannedDowntime, totalTimes.plannedDowntime + totalTimes.breakTime + totalTimes.microstops, ActualProductionQuantity, ActualProductionYield, processOrder);
        const metrics = calculator.getMetrics(machineId);
        if (!metrics) throw new Error(`Metrics could not be calculated for machineId: ${machineId}.`);
        logTabularData(metrics);
       
        if (process.env.WEBSOCKET === 'true') {
            sendWebSocketMessage("OEEData", metrics);
            oeeLogger.info("OEE data sent to WebSocket clients.");
        } else {
            oeeLogger.debug("WebSocket is disabled, skipping data send.");
        }
    } catch (error) {
        errorLogger.error(`Error calculating metrics for machine ${machineId}: ${error.message}`);
    }
}

function logMetricBuffer() {
    oeeLogger.info("Current state of metric buffers:");
    metricBuffers.forEach((buffer, machineId) => {
        oeeLogger.info(`Machine ID: ${machineId}`);
        Object.keys(buffer).forEach((metricName) => {
            oeeLogger.info(`  ${metricName}: ${buffer[metricName]}`);
        });
    });
}


function calculateTotalTimes(datasets) {
    return datasets.reduce((totals, dataset, index) => {
        const total = dataset.data.reduce((a, b) => a + b, 0);
        switch (index) {
            case 0: totals.productionTime = total; break;
            case 1: totals.breakTime = total; break;
            case 2: totals.unplannedDowntime = total; break;
            case 3: totals.plannedDowntime = total; break;
            case 4: totals.microstops = total; break;
        }
        return totals;
    }, { productionTime: 0, breakTime: 0, unplannedDowntime: 0, plannedDowntime: 0, microstops: 0 });
}

function validateInputData(totalTimes, machineId) {
    const { unplannedDowntime, plannedDowntime, productionTime } = totalTimes;
    if (productionTime <= 0) throw new Error(`Invalid input data for machine ${machineId}: productionTime must be greater than 0`);
    if (unplannedDowntime < 0 || plannedDowntime < 0) throw new Error(`Invalid input data for machine ${machineId}: downtime values must be non-negative`);
}

async function getOEEMetrics(machineId) {
    try {
        const buffer = metricBuffers.get(machineId) || null;
        oeeLogger.info(`Fetching OEE metrics for machineId ${machineId}: ${JSON.stringify(buffer)}`);
        if (!buffer) {
            oeeLogger.warn(`No buffer found for machineId ${machineId}`);
            return null;
        }

        const calculator = oeeCalculators.get(machineId);
        if (calculator) {
            const metrics = calculator.getMetrics(machineId);
            oeeLogger.info(`Metrics for machineId ${machineId}: ${JSON.stringify(metrics)}`);
            return metrics || buffer; // Rückgriff auf Buffer bei fehlenden Metriken
        }

        return buffer; // Rückgabe der Bufferdaten, wenn kein Calculator vorhanden
    } catch (error) {
        errorLogger.error(`Error fetching OEE metrics for machine ${machineId}: ${error.stack}`);
        return null;
    }
}


function validateOEEData(OEEData) {
    if (!OEEData || !Array.isArray(OEEData.datasets) || !OEEData.labels) throw new Error("Invalid OEEData format.");
}

module.exports = { updateMetric, processMetrics, getOEEMetrics };
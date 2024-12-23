const { oeeLogger, errorLogger } = require("../utils/logger");
const { writeOEEToInfluxDB } = require("../services/oeeMetricsService");
const { loadMachineData, loadDataAndPrepareOEE, loadProcessOrderDataByMachine } = require("./dataLoader");
const { influxdb } = require("../config/config");
const OEECalculator = require("./oeeCalculator");
const { sendWebSocketMessage } = require("../websocket/webSocketUtils");
const axios = require('axios');
const moment = require("moment-timezone");
require('dotenv').config(); // Laden der Umgebungsvariablen

// Zugriff auf die Umgebungsvariablen
const dateFormat = process.env.DATE_FORMAT;
const timezone = process.env.TIMEZONE;

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

    // Sicherstellen, dass die Variablen nicht null oder undefined sind
    const safeLineId = lineId || "Unknown";
    const safeClassification = classification || "N/A";

    // Sicherstellen, dass numerische Werte nicht null oder undefined sind
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
async function getPlantAndArea(machineId) {
    try {
        const url = `${process.env.OEE_API_URL}/workcenters/${machineId}`;
        
        const response = await axios.get(url);
        
        const machine = response.data;
        if (!machine) {
            oeeLogger.warn(`No data returned for machineId ${machineId}`);
        }
        
        return {
            plant: machine?.Plant || UNKNOWN_VALUES.PLANT,
            area: machine?.area || UNKNOWN_VALUES.AREA,
            lineId: machine?.name || UNKNOWN_VALUES.LINE,
        };
    } catch (error) {
        errorLogger.error(`Error retrieving plant and area for machineId ${machineId}: ${error.message}`);
        return { plant: UNKNOWN_VALUES.PLANT, area: UNKNOWN_VALUES.AREA, lineId: UNKNOWN_VALUES.LINE };
    }
}

async function updateMetric(name, value, machineId) {
    try {
        if (!metricBuffers.has(machineId)) metricBuffers.set(machineId, {});
        oeeLogger.debug("Debug:Function updateMetric ");
        oeeLogger.debug("-----------------------");
        const buffer = metricBuffers.get(machineId);
        if (buffer[name] !== value) {
            buffer[name] = value;
            await processMetrics(machineId, buffer);
            oeeLogger.debug(`Updating metric ${name} for machineId ${machineId} with value: ${value}`);
        } else {
            console.log(`No change detected for ${name}.`);
        }
        logMetricBuffer();
    } catch (error) {
        errorLogger.error(`Error updating metric ${name} for machineId ${machineId}: ${error.message}`);
    }
}

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
        oeeLogger.debug(`Plant: ${plant}, Area: ${area}, Line: ${lineId}`);

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
         await calculator.calculateMetrics(machineId, totalTimes.UnplannedDowntime, totalTimes.plannedDowntime + totalTimes.breakTime + totalTimes.microstops, ActualProductionQuantity, ActualProductionYield, processOrder);
        const metrics = calculator.getMetrics(machineId);
        if (!metrics) throw new Error(`Metrics could not be calculated for machineId: ${machineId}.`);
        logTabularData(metrics);
        if (processOrder.ProcessOrderStatus === 'COMPLETED' || processOrder.ActualProcessOrderEnd) {
            if (influxdb.url && influxdb.token && influxdb.org && influxdb.bucket) {
                await writeOEEToInfluxDB(metrics);
                oeeLogger.debug("Metrics written to InfluxDB.");
            }
        } else {
            oeeLogger.debug(`Process Order for machine ${machineId} is not completed. InfluxDB write skipped.`);
        }
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
    oeeLogger.debug("Current state of metric buffers:");
    metricBuffers.forEach((buffer, machineId) => {
        oeeLogger.debug(`Machine ID: ${machineId}`);
        Object.keys(buffer).forEach((metricName) => {
            oeeLogger.debug(`  ${metricName}: ${buffer[metricName]}`);
        });
    });
}

function calculateTotalTimes(datasets) {
    return datasets.reduce((totals, dataset, index) => {
        const total = dataset.data.reduce((a, b) => a + b, 0);
        switch (index) {
            case 0: totals.productionTime = total; break;
            case 1: totals.breakTime = total; break;
            case 2: totals.UnplannedDowntime = total; break;
            case 3: totals.plannedDowntime = total; break;
            case 4: totals.microstops = total; break;
        }
        return totals;
    }, { productionTime: 0, breakTime: 0, UnplannedDowntime: 0, plannedDowntime: 0, microstops: 0 });
}

function validateInputData(totalTimes, machineId) {
    const { UnplannedDowntime, plannedDowntime, productionTime } = totalTimes;
    if (productionTime <= 0) throw new Error(`Invalid input data for machine ${machineId}: productionTime must be greater than 0`);
    if (UnplannedDowntime < 0 || plannedDowntime < 0) throw new Error(`Invalid input data for machine ${machineId}: downtime values must be non-negative`);
}

async function getOEEMetrics(machineId) {
    const buffer = metricBuffers.get(machineId);
    if (!buffer) return null;
    await processMetrics(machineId, buffer);
    const calculator = oeeCalculators.get(machineId);
    return calculator ? calculator.getMetrics(machineId) : null;
}

function validateOEEData(OEEData) {
    if (!OEEData || !Array.isArray(OEEData.datasets) || !OEEData.labels) throw new Error("Invalid OEEData format.");
}

module.exports = { updateMetric, processMetrics, getOEEMetrics };
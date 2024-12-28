// Import required modules and functions from utility files
const { oeeLogger, errorLogger } = require("../utils/logger");
const { processMetrics, updateMetric } = require("./oeeProcessor");
const {
    handleHoldCommand,
    handleUnholdCommand,
    handleProcessOrderStartCommand,
    handleProcessOrderEndCommand,
} = require("./commandHandler");
const oeeConfig = require("../config/oeeConfig.json");

const { loadProcessOrderDataByMachine } = require("./dataLoader");

// Persistent metrics matrix to keep track of all metrics over time
let metricsMatrix = [];

/**
 * Processes OEE (Overall Equipment Effectiveness) messages by updating the relevant metrics
 * and triggering the metric processing workflow.
 *
 * @param {Object} decodedMessage - The decoded message containing OEE metrics.
 * @param {string} machineId - The machine ID.
 */
async function handleOeeMessage(decodedMessage, machineId) {
    try {
        initializeOeeData(machineId);
        const processOrderData = await loadProcessOrderDataByMachine(machineId);
        validateProcessOrderData(processOrderData);

        for (const { name, value } of decodedMessage.metrics) {
            await processMetric(name, value, machineId, processOrderData);
        }
    } catch (error) {
        logError(error, machineId);
    }
}

function initializeOeeData(machineId) {
    this.oeeData = this.oeeData || {};
    this.oeeData[machineId] = this.oeeData[machineId] || {};
    oeeLogger.debug(`Initialized oeeData for machineId: ${machineId}`);
}

function validateProcessOrderData(processOrderData) {
    if (!Array.isArray(processOrderData)) {
        throw new Error("Process order data is not an array");
    }
}

async function processMetric(name, value, machineId, processOrderData) {
    let metricSource = "undefined";
    let finalValue = value;

    if (!oeeConfig[name]) {
        oeeLogger.warn(`Metric ${name} is not defined in oeeConfig.`);
        return;
    }

    if (oeeConfig[name].machineConnect === true) {
        if (isValidValue(value)) {
            metricSource = "MQTT";
            await updateMetricIfChanged(name, value, machineId);
        } else {
            oeeLogger.warn(`Metric ${name} has an invalid value: ${value}. Skipping.`);
        }
    } else if (isMandatoryStaticMetric(name)) {
        const order = processOrderData.find(order => order.machine_id === machineId);
        if (order) {
            finalValue = calculateFinalValue(name, order);
            metricSource = getMetricSource(name);
            await updateMetricIfChanged(name, finalValue, machineId);
        } else {
            oeeLogger.warn(`No process order found for machine ID ${machineId}. Skipping metric ${name}.`);
        }
    } else {
        oeeLogger.warn(`Metric ${name} is neither marked for calculation nor mandatory. Skipping.`);
    }

    updateMetricsMatrix(name, metricSource, finalValue);
}

function isMandatoryStaticMetric(name) {
    const mandatoryStaticMetrics = ["plannedProductionQuantity", "Runtime", "targetPerformance"];
    return mandatoryStaticMetrics.includes(name);
}

function getMetricSource(name) {
    return name === "Runtime" ? "Process Order (Calculated)" : "Process Order";
}

function logError(error, machineId) {
    errorLogger.error(`Error processing metrics for machine ${machineId}: ${error.message}`);
    errorLogger.error(error.stack);
}

function isValidValue(value) {
    return value !== undefined && value !== null && !isNaN(value);
}

async function updateMetricIfChanged(name, value, machineId) {
    if (this.oeeData[machineId][name] !== value) {
        await updateMetric(name, value, machineId);
        this.oeeData[machineId][name] = value;
        oeeLogger.debug(`Updated metric ${name} for machineId ${machineId} to ${value}`);
    }
}

function calculateFinalValue(name, order) {
    return name === "Runtime" ? order.setupTime + order.processingTime + order.teardownTime : order[name];
}

function updateMetricsMatrix(name, source, value) {
    let metricEntry = metricsMatrix.find(entry => entry.metric === name);
    if (metricEntry) {
        metricEntry.source = source;
        metricEntry.value = value !== undefined ? value : "N/A";
        metricEntry.valid = source !== "undefined";
    } else {
        metricsMatrix.push({
            metric: name,
            source: source,
            value: value !== undefined ? value : "N/A",
            valid: source !== "undefined",
        });
    }
}

/**
 * Processes command messages by delegating the handling to appropriate command handlers
 * based on the command type.
 * It is used to handle Hold and Unhold commands to record the start and end times of the hold state for unplanned downtime.
 *
 * @param {Object} decodedMessage - The decoded message containing command metrics.
 * @param {string} machineId - The machine ID.
 */
async function handleCommandMessage(decodedMessage, machineId) {
    try {
        if (!decodedMessage?.metrics || !Array.isArray(decodedMessage.metrics)) {
            throw new Error("Invalid decodedMessage format");
        }

        for (const { name, value } of decodedMessage.metrics) {
            const startTime = Date.now();

            switch (name) {
                case "Hold":
                    oeeLogger.info(`Command/Hold: ${name}`);
                    await handleHoldCommand(value, machineId);
                    break;
                case "Unhold":
                    oeeLogger.info(`Command/Unhold: ${name}`);
                    await handleUnholdCommand(value, machineId);
                    break;
                case "Start":
                    oeeLogger.info(`Command/Start Value: ${machineId}`);
                    await handleProcessOrderStartCommand(value, machineId);
                    oeeLogger.info(`Command/Start: ${name}`);
                    break;
                case "End":
                    await handleProcessOrderEndCommand(value, machineId);
                    oeeLogger.info(`Command/End: ${name}`);
                    break;
                default:
                    oeeLogger.warn(`Unknown command: ${name}`);
                    break;
            }

            const endTime = Date.now();
            oeeLogger.debug(`Processed command: ${name} in ${endTime - startTime}ms`);
        }
    } catch (error) {
        errorLogger.error(`Error in handleCommandMessage: ${error.message}`);
        errorLogger.error(error.stack);
    }
}

// Export the functions to be used in other modules
module.exports = { handleOeeMessage, handleCommandMessage };
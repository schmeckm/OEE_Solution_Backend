const { oeeLogger, errorLogger } = require("../utils/logger");
const { processMetrics, updateMetric } = require("./oeeProcessor");
const {
    handleHoldCommand,
    handleUnholdCommand,
    handleProcessOrderStartCommand,
    handleProcessOrderEndCommand,
} = require("./commandHandler");

// Fallback configuration if oeeConfig.json is not available
const oeeConfig = require("../config/oeeConfig.json") || {
    plannedProductionQuantity: { machineConnect: false },
    Runtime: { machineConnect: false },
    targetPerformance: { machineConnect: false },
};

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

        // Create a map for faster lookup of process orders by machineId
        const processOrderMap = processOrderData.reduce((map, order) => {
            map[order.machine_id] = order;
            return map;
        }, {});

        for (const { name, value } of decodedMessage.metrics) {
            await processMetric(name, value, machineId, processOrderMap);
        }

        // Clean up the metrics matrix periodically
        cleanupMetricsMatrix();
    } catch (error) {
        errorLogger.error(`Error processing metrics for machine ${machineId}: ${error.message}`);
        errorLogger.error(`Stack trace: ${error.stack}`);
    }
}

/**
 * Initializes OEE data for a specific machine.
 *
 * @param {string} machineId - The machine ID.
 */
function initializeOeeData(machineId) {
    this.oeeData = this.oeeData || {};
    this.oeeData[machineId] = this.oeeData[machineId] || {};
    oeeLogger.debug(`Initialized oeeData for machineId: ${machineId}`);
}

/**
 * Validates the process order data.
 *
 * @param {Array} processOrderData - The process order data.
 */
function validateProcessOrderData(processOrderData) {
    if (!Array.isArray(processOrderData)) {
        throw new Error("Process order data is not an array");
    }
    if (processOrderData.length === 0) {
        throw new Error("Process order data is empty");
    }
}

/**
 * Processes a single metric and updates it if necessary.
 *
 * @param {string} name - The metric name.
 * @param {any} value - The metric value.
 * @param {string} machineId - The machine ID.
 * @param {Object} processOrderMap - A map of process orders indexed by machineId.
 */
async function processMetric(name, value, machineId, processOrderMap) {
    if (!oeeConfig[name]) {
        oeeLogger.warn(`Metric ${name} is not defined in oeeConfig.`);
        return;
    }

    const order = processOrderMap[machineId];
    if (!order && isMandatoryStaticMetric(name)) {
        oeeLogger.warn(`No process order found for machine ID ${machineId}. Skipping metric ${name}.`);
        return;
    }

    let metricSource = "undefined";
    let finalValue = value;

    if (oeeConfig[name].machineConnect === true && isValidValue(value)) {
        metricSource = "MQTT";
        await updateMetricIfChanged(name, value, machineId);
    } else if (isMandatoryStaticMetric(name)) {
        finalValue = calculateFinalValue(name, order);
        metricSource = getMetricSource(name);
        await updateMetricIfChanged(name, finalValue, machineId);
    } else {
        oeeLogger.warn(`Metric ${name} is neither marked for calculation nor mandatory. Skipping.`);
    }

    updateMetricsMatrix(name, metricSource, finalValue);
}

/**
 * Checks if a metric is a mandatory static metric.
 *
 * @param {string} name - The metric name.
 * @returns {boolean} True if the metric is mandatory, otherwise false.
 */
function isMandatoryStaticMetric(name) {
    const mandatoryStaticMetrics = ["plannedProductionQuantity", "Runtime", "targetPerformance"];
    return mandatoryStaticMetrics.includes(name);
}

/**
 * Gets the source of a metric.
 *
 * @param {string} name - The metric name.
 * @returns {string} The metric source.
 */
function getMetricSource(name) {
    return name === "Runtime" ? "Process Order (Calculated)" : "Process Order";
}

/**
 * Checks if a value is valid.
 *
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value is valid, otherwise false.
 */
function isValidValue(value) {
    return value !== undefined && value !== null && !isNaN(value);
}

/**
 * Updates a metric if its value has changed.
 *
 * @param {string} name - The metric name.
 * @param {any} value - The new value.
 * @param {string} machineId - The machine ID.
 */
async function updateMetricIfChanged(name, value, machineId) {
    if (this.oeeData[machineId][name] !== value) {
        await updateMetric(name, value, machineId);
        this.oeeData[machineId][name] = value;
        oeeLogger.debug(`Updated metric ${name} for machineId ${machineId} to ${value}`);
    }
}

/**
 * Calculates the final value for a metric.
 *
 * @param {string} name - The metric name.
 * @param {Object} order - The process order data.
 * @returns {number} The calculated value.
 */
function calculateFinalValue(name, order) {
    return name === "Runtime" ? order.setupTime + order.processingTime + order.teardownTime : order[name];
}

/**
 * Updates the metrics matrix with the latest values and sources.
 *
 * @param {string} name - The metric name.
 * @param {string} source - The metric source.
 * @param {any} value - The metric value.
 */
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
 * Cleans up the metrics matrix by removing invalid entries.
 */
function cleanupMetricsMatrix() {
    metricsMatrix = metricsMatrix.filter(entry => entry.valid);
}

/**
 * Processes command messages by delegating the handling to appropriate command handlers
 * based on the command type.
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
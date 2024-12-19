// Import required modules and functions from utility files
const { oeeLogger, errorLogger, defaultLogger } = require("../utils/logger");
const { processMetrics, updateMetric } = require("./oeeProcessor");
const {
    handleHoldCommand,
    handleUnholdCommand,
    handleProcessOrderStartCommand,
    handleProcessOrderEndCommand,
} = require("./commandHandler");
const oeeConfig = require("../config/oeeConfig.json");
const { loadProcessOrderData, loadProcessOrderDataByMachine } = require("./dataLoader");
const moment = require("moment-timezone");

// Persistent metrics matrix to keep track of all metrics over time
let metricsMatrix = [];

/**
 * Processes OEE (Overall Equipment Effectiveness) messages by updating the relevant metrics
 * and triggering the metric processing workflow.
 *
 * @param {Object} decodedMessage - The decoded message containing OEE metrics.
 * @param {string} machineId - The machine ID.
 */
async function handleOeeMessage(decodedMessage, machineId, metric) {
    try {
        // Initialize oeeData if not already initialized
        if (!this.oeeData) {
            this.oeeData = {};
            oeeLogger.debug("Debug:handleOeeMessage ");
            oeeLogger.debug("-----------------------");
        }

        // Initialize oeeData for the specific machineId if not present
        if (!this.oeeData[machineId]) {
            this.oeeData[machineId] = {};
            oeeLogger.debug(`Initialized oeeData for machineId: ${machineId}`);
        }

        let validMetricProcessed = false;

        // Define mandatory static metrics required for OEE calculation
        const mandatoryStaticMetrics = [
            "plannedProductionQuantity",
            "Runtime",
            "targetPerformance",
        ];

        // Load the process order data
        oeeLogger.debug(`Loading process order data for machineId: ${machineId}`);
        const processOrderData = await loadProcessOrderDataByMachine(machineId);

        // oeeLogger.debug('Process Order Data: ' + JSON.stringify(processOrderData, null, 2));
        
        // Check if processOrderData is an array
        if (!Array.isArray(processOrderData)) {
            throw new Error("Process order data is not an array");
        }

        // Iterate over each metric in the decoded message
        for (const metricData of decodedMessage.metrics) {
            const { name, value } = metricData;
            let metricSource = "undefined"; // Default source as undefined
            let finalValue = value;

            // Check if the metric is defined in oeeConfig
            if (oeeConfig[name]) {
                // Update metric from MQTT data if the metric is connected to the machine
                if (oeeConfig[name].machineConnect === true) {
                    if (value !== undefined && value !== null && !isNaN(value)) {
                        metricSource = "MQTT";

                        if (this.oeeData[machineId][name] !== value) {
                            oeeLogger.debug(`Metric ${name} for machineId ${machineId} will be updated from ${this.oeeData[machineId][name]} to ${value}`);
                            await updateMetric(name, value, machineId);
                            validMetricProcessed = true;
                            this.oeeData[machineId][name] = value;
                            oeeLogger.debug(`Updated metric ${name} from MQTT data`);
                        }
                    } else {
                        oeeLogger.warn(
                            `Metric ${name} has an invalid value: ${value}. Skipping.`
                        );
                    }
                // Update metric from process order if it's a mandatory static metric
                } else if (mandatoryStaticMetrics.includes(name)) {
                    const order = processOrderData.find(
                        (order) => order.machine_id === machineId
                    );

                    if (order) {
                        if (name === "Runtime") {
                            finalValue =
                                order.setupTime + order.processingTime + order.teardownTime;
                            metricSource = "Process Order (Calculated)";
                        } else {
                            finalValue = order[name];
                            metricSource = "Process Order";
                        }

                        if (
                            finalValue !== undefined &&
                            finalValue !== null &&
                            !isNaN(finalValue)
                        ) {
                            if (this.oeeData[machineId][name] !== finalValue) {
                                await updateMetric(name, finalValue, machineId);
                                validMetricProcessed = true;
                                this.oeeData[machineId][name] = finalValue;
                                oeeLogger.debug(`Updated metric ${name} from process order data`);
                            }
                        } else {
                            oeeLogger.warn(
                                `Static metric ${name} not found or invalid in process order. Skipping.`
                            );
                        }
                    } else {
                        oeeLogger.warn(
                            `No process order found for machine ID ${machineId}. Skipping metric ${name}.`
                        );
                    }
                } else {
                    oeeLogger.warn(
                        `Metric ${name} is neither marked for calculation nor mandatory. Skipping.`
                    );
                }
            } else {
                oeeLogger.warn(`Metric ${name} is not defined in oeeConfig.`);
            }

            // Update the metrics matrix with the processed metric
            let metricEntry = metricsMatrix.find((entry) => entry.metric === name);
            if (metricEntry) {
                metricEntry.source = metricSource;
                metricEntry.value = finalValue !== undefined ? finalValue : "N/A";
                metricEntry.valid = metricSource !== "undefined";
            } else {
                metricsMatrix.push({
                    metric: name,
                    source: metricSource,
                    value: finalValue !== undefined ? finalValue : "N/A",
                    valid: metricSource !== "undefined",
                });
            }
        }
        oeeLogger.debug(
            "Complete Metrics Matrix: " + JSON.stringify(metricsMatrix, null, 2)
        );
    } catch (error) {
        errorLogger.error(
            `Error processing metrics for machine ${machineId}: ${error.message}`
        );
        errorLogger.error(error.stack);
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
        // Validate the format of the decoded message
        if (!decodedMessage ||
            !decodedMessage.metrics ||
            !Array.isArray(decodedMessage.metrics)
        ) {
            throw new Error("Invalid decodedMessage format");
        }

        // Iterate over each command metric in the decoded message
        for (const metricData of decodedMessage.metrics) {
            const { name, value, type, alias } = metricData;

            const startTime = Date.now();

            // Handle different command types (Hold, Unhold, Start, End)
            switch (name) {
                case "Hold":
                    console.log(`Command/Hold: ${name}`);
                    await handleHoldCommand(value, machineId);
                    break;
                case "Unhold":
                    console.log(`Command/Unhold: ${name}`);
                    await handleUnholdCommand(value, machineId);
                    break;
                case "Start":
                    await handleProcessOrderStartCommand(value, machineId);
                    console.log(`Command/Start: ${name}`);
                    // Future enhancement: add functionality to log the start of the process
                    break;
                case "End":
                    await handleProcessOrderEndCommand(value, machineId);
                    console.log(`Command/End: ${name}`);
                    // Future enhancement: add functionality to log the end of the process
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
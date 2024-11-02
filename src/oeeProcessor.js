const path = require("path"); // Import the path module for handling file paths
const { oeeLogger, errorLogger } = require("../utils/logger"); // Import logging utilities for OEE and error logging
const { writeOEEToInfluxDB } = require("../services/oeeMetricsService"); // Import the function to write OEE metrics to InfluxDB
const {
    loadMachineData,
    loadDataAndPrepareOEE,
    loadProcessOrderDataByMachine,
} = require("./dataLoader"); // Import functions for loading machine and process order data
const { influxdb } = require("../config/config"); // Import InfluxDB configuration settings
const OEECalculator = require("./oeeCalculator"); // Import the OEECalculator class
const {
    setWebSocketServer,
    sendWebSocketMessage,
} = require("../websocket/webSocketUtils"); // Import WebSocket utilities

// Define constants for unknown values
const UNKNOWN_VALUES = {
    PLANT: 'UnknownPlant',
    AREA: 'UnknownArea',
    LINE: 'UnknownLine'
};

// Initialize maps for storing OEE calculators and metric buffers
const oeeCalculators = new Map(); // Map to store OEE calculators per machine ID
let metricBuffers = new Map(); // Buffer to store metrics per machine
let logCallCount = 0; // Counter for tracking log calls

/**
 * Logs tabular data of OEE metrics for a specific machine.
 * @param {Object} metrics - The metrics to log.
 */
function logTabularData(metrics) {
    const {
        lineId = UNKNOWN_VALUES.LINE,
            oee = 0,
            availability = 0,
            performance = 0,
            quality = 0,
            PlannedProductionQuantity = 0,
            ActualProductionQuantity = 0,
            ActualProductionYield = 0,
            plannedDurationMinutes = 0,
            plannedTakt = 0,
            actualTakt = 0,
            setupTime = 0,
            teardownTime = 0,
            classification = "N/A",
    } = metrics;

    logCallCount++; // Increment the log call count
    console.log(`Call number: ${logCallCount}`); // Log the current call number

    // Create a formatted log table for metrics
    const logTable = `
  +-----------------------------------------------+-------------------+
  | Metric                                        | Value             |
  +-----------------------------------------------+-------------------+
  | Machine                                       | ${lineId.padEnd(2)}          |
  | Availability (%)                              | ${availability.toFixed(2).padStart(6)}%           |
  | Performance (%)                               | ${performance.toFixed(2).padStart(6)}%           |
  | Quality (%)                                   | ${quality.toFixed(2).padStart(6)}%           |
  | OEE (%)                                       | ${oee.toFixed(2).padStart(6)}%           |
  | Classification                                | ${classification.padEnd(2)}     |
  | Planned Production Quantity                   | ${PlannedProductionQuantity.toString().padStart(6)}            |
  | Actual Production Quantity                    | ${ActualProductionQuantity.toString().padStart(6)}            |
  | Actual Yield Quantity                         | ${ActualProductionYield.toString().padStart(6)}            |
  | Production Time (Min)                         | ${plannedDurationMinutes.toString().padStart(6)}            |
  | Setup Time (Min)                              | ${setupTime.toString().padStart(6)}            |
  | Teardown Time (Min)                           | ${teardownTime.toString().padStart(6)}            |
  | Planned Takt (Min/unit)                       | ${plannedTakt.toFixed(2).padStart(6)}            |
  | Actual Takt (Min/unit)                        | ${actualTakt.toFixed(2).padStart(6)}            |
  +-----------------------------------------------+-------------------+
  `;
    console.log(`\n--- OEE Metrics for Machine: ${lineId} ---`); // Log header for metrics
    console.log(logTable); // Log the metrics table
}

/**
 * Retrieves the plant and area information for a given machine ID.
 * @param {string} machineId - The ID of the machine.
 * @returns {Object} - The plant and area information.
 */
async function getPlantAndArea(machineId) {
    try {
        const machines = await loadMachineData(); // Load machine data
        const machine = machines.find((m) => m.machine_id === machineId); // Find the machine by ID

        return {
            plant: (machine && machine.Plant) ? machine.Plant : UNKNOWN_VALUES.PLANT,
            area: (machine && machine.area) ? machine.area : UNKNOWN_VALUES.AREA,
            lineId: (machine && machine.name) ? machine.name : UNKNOWN_VALUES.LINE,
        };

    } catch (error) {
        // Log error if unable to retrieve plant and area data
        errorLogger.error(`Error retrieving plant and area for machineId ${machineId}: ${error.message}`);
        return {
            plant: UNKNOWN_VALUES.PLANT,
            area: UNKNOWN_VALUES.AREA,
            lineId: UNKNOWN_VALUES.LINE,
        };
    }
}

/**
 * Updates the metric buffer for a specific machine and processes the metrics.
 * @param {string} name - The name of the metric to update.
 * @param {number} value - The value of the metric.
 * @param {string} machineId - The ID of the machine.
 */
async function updateMetric(name, value, machineId) {
    try {
        if (!metricBuffers.has(machineId)) {
            metricBuffers.set(machineId, {}); // Initialize buffer if it doesn't exist
        }

        const buffer = metricBuffers.get(machineId); // Get the metric buffer for the machine
        oeeLogger.debug(`Updating buffer for machine ${machineId}:`, buffer); // Log the buffer state

        // Check if the new value is different from the stored value
        if (buffer[name] !== value) {
            buffer[name] = value; // Update the value in the buffer
            await processMetrics(machineId, buffer); // Process the metrics
        } else {
            console.log(`No change detected for ${name}.`); // Log if no change
        }

        logMetricBuffer(); // Log the current buffer

    } catch (error) {
        // Log error if unable to update the metric
        errorLogger.error(`Error updating metric ${name} for machineId ${machineId}: ${error.message}`);
    }
}

/**
 * Processes the metrics for a specific machine.
 * @param {string} machineId - The ID of the machine.
 * @param {Object} buffer - The buffer containing metric values.
 */
async function processMetrics(machineId, buffer) {
    try {
        let calculator = oeeCalculators.get(machineId); // Retrieve the calculator for the machine
        if (!calculator) {
            calculator = new OEECalculator(); // Create a new OEE calculator if it doesn't exist
            await calculator.init(machineId); // Initialize the calculator
            oeeCalculators.set(machineId, calculator); // Store the calculator in the map
        }

        const { plant, area, lineId } = await getPlantAndArea(machineId); // Get plant and area data

        calculator.oeeData[machineId] = {
            ...calculator.oeeData[machineId],
            plant,
            area,
            lineId,
            ...buffer, // Add the buffer data to the oeeData object
        };

        const processOrderData = await loadProcessOrderDataByMachine(machineId); // Load process order data
        if (!processOrderData || processOrderData.length === 0) {
            throw new Error(`No active process order found for machine ${machineId}`); // Error if no active order
        }

        const processOrder = processOrderData[0]; // Get the first process order
        const OEEData = await loadDataAndPrepareOEE(machineId); // Load and prepare OEE data
        validateOEEData(OEEData); // Validate OEE data

        const totalTimes = calculateTotalTimes(OEEData.datasets); // Calculate total times
        validateInputData(totalTimes, machineId); // Validate the input data

        // Get production quantities from the buffer
        const ActualProductionQuantity =
            (buffer && buffer.ActualProductionQuantity) || 0; // Fallback to 0 if the value doesn't exist

        const ActualProductionYield =
            (buffer && buffer.ActualProductionYield) || 0; // Fallback to 0 if the value doesn't exist

        // Log values before calculation
        oeeLogger.debug(`Calculating metrics for machineId ${machineId} with values:`, {
            UnplannedDowntime: totalTimes.UnplannedDowntime,
            plannedDowntime: totalTimes.plannedDowntime + totalTimes.breakTime + totalTimes.microstops,
            ActualProductionQuantity,
            ActualProductionYield,
            processOrder
        });

        // Calculate metrics continuously
        await calculator.calculateMetrics(
            machineId,
            totalTimes.UnplannedDowntime,
            totalTimes.plannedDowntime + totalTimes.breakTime + totalTimes.microstops,
            ActualProductionQuantity,
            ActualProductionYield,
            processOrder
        );

        const metrics = calculator.getMetrics(machineId); // Get calculated metrics

        // Log the calculated metrics
        oeeLogger.debug(`Metrics for machineId ${machineId}:`, metrics);

        if (!metrics) {
            throw new Error(`Metrics could not be calculated for machineId: ${machineId}.`);
        }

        logTabularData(metrics); // Log metrics in tabular format

        // Write metrics to InfluxDB only if the process order is completed
        const isOrderCompleted =
            processOrder.ProcessOrderStatus === 'COMPLETED' ||
            processOrder.ActualProcessOrderEnd; // Check if the order is completed

        if (isOrderCompleted) {
            if (influxdb.url && influxdb.token && influxdb.org && influxdb.bucket) {
                await writeOEEToInfluxDB(metrics); // Write only at the end to InfluxDB
                oeeLogger.debug("Metrics written to InfluxDB.");
            }
        } else {
            oeeLogger.debug(`Process Order for machine ${machineId} is not completed. InfluxDB write skipped.`);
        }

        // Send WebSocket message only if WEBSOCKET=true
        if (process.env.WEBSOCKET === 'true') {
            sendWebSocketMessage("OEEData", metrics); // Send OEE data to WebSocket clients
            oeeLogger.info("OEE data sent to WebSocket clients.");
        } else {
            oeeLogger.debug("WebSocket is disabled, skipping data send.");
        }

    } catch (error) {
        // Log error if unable to calculate metrics
        errorLogger.error(`Error calculating metrics for machine ${machineId}: ${error.message}`);
    }
}

/**
 * Logs the current state of metric buffers.
 */
function logMetricBuffer() {
    oeeLogger.debug("Current state of metric buffers:");
    metricBuffers.forEach((buffer, machineId) => {
        oeeLogger.warn(`Machine ID: ${machineId}`);
        Object.keys(buffer).forEach((metricName) => {
            oeeLogger.warn(`  ${metricName}: ${buffer[metricName]}`);
        });
    });
}

/**
 * Calculates total times from the provided datasets.
 * @param {Array} datasets - The datasets containing timing information.
 * @returns {Object} - The total times calculated.
 */
function calculateTotalTimes(datasets) {
    return datasets.reduce((totals, dataset, index) => {
        const total = dataset.data.reduce((a, b) => a + b, 0); // Sum all data points in the dataset
        switch (index) {
            case 0:
                totals.productionTime = total; // Assign production time
                break;
            case 1:
                totals.breakTime = total; // Assign break time
                break;
            case 2:
                totals.UnplannedDowntime = total; // Assign unplanned downtime
                break;
            case 3:
                totals.plannedDowntime = total; // Assign planned downtime
                break;
            case 4:
                totals.microstops = total; // Assign microstops
                break;
            default:
                break;
        }
        return totals; // Return accumulated totals
    }, {
        productionTime: 0,
        breakTime: 0,
        UnplannedDowntime: 0,
        plannedDowntime: 0,
        microstops: 0,
    });
}

/**
 * Validates the input data for processing metrics.
 * @param {Object} totalTimes - The total times object containing various downtime and production times.
 * @param {string} machineId - The ID of the machine.
 */
function validateInputData(totalTimes, machineId) {
    const { UnplannedDowntime, plannedDowntime, productionTime } = totalTimes;

    if (productionTime <= 0) {
        throw new Error(`Invalid input data for machine ${machineId}: productionTime must be greater than 0`);
    }

    if (UnplannedDowntime < 0 || plannedDowntime < 0) {
        throw new Error(`Invalid input data for machine ${machineId}: downtime values must be non-negative`);
    }
}

/**
 * Retrieves OEE metrics for a specific machine.
 * @param {string} machineId - The ID of the machine.
 * @returns {Object|null} - The OEE metrics or null if not found.
 */
async function getOEEMetrics(machineId) {
    // Load buffer data from cache (metricBuffers)
    const buffer = metricBuffers.get(machineId);

    if (!buffer) {
        return null; // No buffer present
    }

    // Calculate the OEE data by calling `processMetrics`
    await processMetrics(machineId, buffer);

    // Get the calculated metrics from the `processMetrics` function
    const calculator = oeeCalculators.get(machineId);
    if (!calculator) {
        return null; // No OEE calculator found for the machine
    }

    return calculator.getMetrics(machineId); // Return the complete OEE data
}

/**
 * Validates the format of the OEE data.
 * @param {Object} OEEData - The OEE data to validate.
 */
function validateOEEData(OEEData) {
    if (!OEEData || !Array.isArray(OEEData.datasets) || !OEEData.labels) {
        throw new Error("Invalid OEEData format.");
    }
}

module.exports = { updateMetric, processMetrics, setWebSocketServer, getOEEMetrics }; // Export functions for use in other modules
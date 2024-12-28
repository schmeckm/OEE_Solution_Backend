const {
    axios,
    moment,
    dotenv,
    oeeLogger,
    errorLogger,
    OEE_API_URL,
    TIMEZONE,
    thresholdSeconds,
    apiClient
} = require("./header");

const { v4: uuidv4 } = require("uuid");
const { invalidateCache  } = require("./dataLoader");
const { sendWebSocketMessage } = require("../websocket/webSocketUtils");
const { influxdb } = require("../config/config");
const { writeOEEToInfluxDB } = require("../services/oeeMetricsService");
let currentHoldStatus = {};

/**
 * Handles the "Hold" command, which places the machine on hold.
 * @param {number} value - The value indicating whether to hold the machine (1 for hold).
 * @param {string} machineId - The ID of the machine being put on hold.
 */
async function handleHoldCommand(value, machineId) {
    const timestamp = moment().tz(TIMEZONE).toISOString();
    console.log(`handleHoldCommand called with value: ${value}, machineId: ${machineId}, timestamp: ${timestamp}`);

    if (value !== 1) {
        logInfo("Hold command received, but value is not 1");
        return;
    }

    logInfo("Machine is on Hold");
    stopMachineOperations();
    logEventToDatabase("Hold", timestamp);
    notifyPersonnel("Machine has been put on hold.");

    currentHoldStatus[machineId] = { startTimestamp: timestamp };
    logInfo(`Hold signal recorded at ${timestamp} for machine ${machineId}`);
}

/**
 * Handles the "Unhold" command, which resumes machine operations.
 * @param {number} value - The value indicating whether to unhold the machine (1 for unhold).
 * @param {string} machineId - The ID of the machine being unhold.
 */
async function handleUnholdCommand(value, machineId) {
    const timestamp = moment().tz(TIMEZONE).toISOString();
    oeeLogger.info(`handleUnholdCommand called with value: ${value}, machineId: ${machineId}`);

    if (value !== 1) {
        logInfo("Unhold command received, but value is not 1");
        return;
    }

    const holdStatus = currentHoldStatus[machineId];
    if (!holdStatus?.startTimestamp) {
        logInfo(`Unhold command received, but no previous Hold signal found for machine ${machineId}.`);
        return;
    }

    logInfo("Machine is now Unhold");
    startMachineOperations();
    logEventToDatabase("Unhold", timestamp);
    notifyPersonnel("Machine has been unhold and resumed operations.");

    let processOrder = null;

    try {
        const response = await apiClient.get(`processorders/rel`, {
            params: { machineId, mark: true },
        });

        processOrder = response.data[0];
        if (processOrder) {
            currentHoldStatus[machineId].processOrderID = processOrder.order_id;
            logInfo(`Process Order ID ${processOrder.order_id} associated with hold for machine ${machineId}`);
        } else {
            logInfo(`No active process order found for machineId: ${machineId}`);
        }
    } catch (error) {
        logError(`Failed to retrieve process order for machineId ${machineId}`, error);
    }

    const holdTimestamp = moment(holdStatus.startTimestamp);
    const downtimeSeconds = moment(timestamp).diff(holdTimestamp, "seconds");

    if (downtimeSeconds > thresholdSeconds) {
        const machineStoppageEntry = {
            ID: uuidv4(),
            Order_ID: processOrder ? processOrder.order_id : null,
            start_date: holdTimestamp.toISOString(),
            end_date: timestamp,
            Reason: "TBD",
            Differenz: downtimeSeconds,
            workcenter_id: machineId,
        };

        logInfo(`Saving machine stoppage entry: ${JSON.stringify(machineStoppageEntry)}`);

        try {
            const response = await apiClient.post("/microstops", machineStoppageEntry);
            const Microstops = response.data;
            logInfo(`Microstops updated successfully: ${JSON.stringify(Microstops)}`);
            sendWebSocketMessage("Microstops", Microstops);
        } catch (error) {
            logError("Error saving Microstops data", error);
        }
    } else {
        logInfo(`Downtime of ${downtimeSeconds} seconds is less than threshold of ${thresholdSeconds} seconds. No entry saved.`);
    }

    delete currentHoldStatus[machineId];
}
/**
 * Updates the actual start time of a process order using the provided API.
 * @param {string} machineId - The ID of the machine starting the process order.
 */
async function handleProcessOrderStartCommand(value, machineId) {
    const timestamp = moment().tz(TIMEZONE).toISOString();
    oeeLogger.info(`handleProcessOrderStart called for machineId: ${machineId} at ${timestamp}`);

    try {
        const response = await apiClient.get(`/processorders/rel`, {
            params: { machineId, mark: true },
        });

        const processOrder = response.data[0];
        delete processOrder.marked;

        if (processOrder) {
            const processOrderId = processOrder.order_id;
            console.log(`Process Order Start for ProcessOrderID: ${processOrderId}`);
            await apiClient.put(`/processorders/${processOrderId}`, {
                ...processOrder,
                actualprocessorderstart: timestamp
            });
            oeeLogger.info(`Updated ActualProcessOrderStart for ProcessOrderID: ${processOrderId} to ${timestamp}`);
        } else {
            oeeLogger.warn(`No active process order found for machineId: ${machineId}`);
        }
    } catch (error) {
        errorLogger.error(`Failed to update ActualProcessOrderStart for machineId ${machineId}: ${error.message}`);
    }
}

/**
 * Updates the actual end time of a process order using the provided API.
 * @param {string} machineId - The ID of the machine ending the process order.
 */
async function handleProcessOrderEndCommand(value, machineId) {
    const timestamp = moment().tz(TIMEZONE).toISOString();
    const processorderstatus = "CLD";
    console.log(`handleProcessOrderEnd called for machineId: ${machineId} at ${timestamp}`);

    let metrics;

    try {
        const response = await apiClient.get(`/processorders/rel`, {
            params: { machineId, mark: true },
        });

        const processOrder = response.data[0];
        delete processOrder.marked;
        oeeLogger.info(`Process Order Start for machine ${machineId} found: ${JSON.stringify(processOrder)}`);
        if (processOrder) {
            const processOrderId = processOrder.order_id;
            oeeLogger.info(`Process Order End for ProcessOrderID: ${processOrderId}`);

            try {
                const response = await apiClient.get(`/oee/${machineId}`);
                metrics = response.data;
                oeeLogger.info(`OEE metrics retrieved successfully for machine ${machineId}: ${JSON.stringify(metrics)}`);
            } catch (error) {
                logError(`Failed to retrieve OEE metrics for machineId ${machineId}`, error);
                return;
            }

            await apiClient.put(`/processorders/${processOrderId}`, {
                ...processOrder,
                actualprocessorderend: timestamp,
                processorderstatus: processorderstatus
            });

        } else {
            oeeLogger.warn(`No active process order found for machineId: ${machineId}`);
        }
    } catch (error) {
        errorLogger.error(`Failed to update ActualProcessOrderEnd for machineId ${machineId}: ${error.message}`);
    }

    if (processorderstatus === 'CLD' || actualprocessorderend) {
        oeeLogger.info(`Process Order for machine ${machineId} is completed. Writing metrics to InfluxDB.`);
            await writeOEEToInfluxDB(metrics);
            oeeLogger.info("Metrics written to InfluxDB.");
            
    } else {
        oeeLogger.debug(`Process Order for machine ${machineId} is not completed. InfluxDB write skipped.`);
    }
    invalidateCache();
}
/**
 * Logs an error message.
 * @param {string} message - The error message to log.
 * @param {Error} [error] - The error object containing details about the error.
 */
function logError(message, error) {
    const fullMessage = message + (error ? ": " + error.message : "");
    errorLogger.error(fullMessage);
    console.log(`ERROR: ${fullMessage}`);
}

/**
 * Logs an informational message.
 * @param {string} message - The informational message to log.
 */
function logInfo(message) {
    oeeLogger.info(message);
    console.log(`INFO: ${message}`);
}

/**
 * Stops machine operations.
 */
function stopMachineOperations() {
    logInfo("Stopping machine operations...");
}

/**
 * Starts machine operations.
 */
function startMachineOperations() {
    logInfo("Starting machine operations...");
}

/**
 * Logs an event to the database with a timestamp.
 * @param {string} event - The event type to log.
 * @param {string} timestamp - The ISO timestamp of the event.
 */
function logEventToDatabase(event, timestamp) {
    logInfo(`Logging event to database: ${event} at ${timestamp}`);
}

/**
 * Notifies personnel about a specific event.
 * @param {string} message - The message to send to personnel.
 */
function notifyPersonnel(message) {
    logInfo(`Notifying personnel: ${message}`);
}

module.exports = {
    handleHoldCommand,
    handleUnholdCommand,
    handleProcessOrderStartCommand,
    handleProcessOrderEndCommand,
};
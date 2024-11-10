const axios = require("axios");
const moment = require("moment-timezone");
const { v4: uuidv4 } = require("uuid");
const { oeeLogger, errorLogger } = require("../utils/logger");
const { saveMachineStoppagesData } = require("./dataLoader");
const { sendWebSocketMessage } = require("../websocket/webSocketUtils");

const TIMEZONE = process.env.TIMEZONE || "UTC";
const OEE_API_URL = process.env.OEE_API_URL;
let currentHoldStatus = {};

// Erstellen einer benutzerdefinierten axios-Instanz mit dem API-Key-Header
const apiClient = axios.create({
    baseURL: OEE_API_URL,
    headers: {
        'x-api-key': process.env.API_KEY,
    },
});

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
    if (!holdStatus || !holdStatus.startTimestamp) {
        logInfo(`Unhold command received, but no previous Hold signal found for machine ${machineId}.`);
        return;
    }

    logInfo("Machine is now Unhold");
    startMachineOperations();
    logEventToDatabase("Unhold", timestamp);
    notifyPersonnel("Machine has been unhold and resumed operations.");

    const holdTimestamp = moment(holdStatus.startTimestamp);
    const downtimeSeconds = moment(timestamp).diff(holdTimestamp, "seconds");

    const machineStoppageEntry = {
        ID: uuidv4(),
        ProcessOrderID: holdStatus.processOrderID || "N/A",
        Start: holdTimestamp.toISOString(),
        End: timestamp,
        Reason: "TBD",
        Differenz: downtimeSeconds,
        machine_id: machineId,
    };

    logInfo(`Saving machine stoppage entry: ${JSON.stringify(machineStoppageEntry)}`);

    try {
        const Microstops = saveMachineStoppagesData(machineStoppageEntry);
        logInfo(`Microstops updated successfully: ${JSON.stringify(Microstops)}`);
        sendWebSocketMessage("Microstops", Microstops);
    } catch (error) {
        logError("Error saving Microstops data", error);
    }

    delete currentHoldStatus[machineId];
}

/**
 * Updates the actual start time of a process order using the provided API.
 * @param {string} machineId - The ID of the machine starting the process order.
 */
async function handleProcessOrderStartCommand(machineId) {
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
            processOrder.ActualProcessOrderStart = timestamp;

            await apiClient.put(`/processorders/${processOrderId}`, processOrder);
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
async function handleProcessOrderEndCommand(machineId) {
    const timestamp = moment().tz(TIMEZONE).toISOString();
    console.log(`handleProcessOrderEnd called for machineId: ${machineId} at ${timestamp}`);

    try {
        const response = await apiClient.get(`/processorders/rel`, {
            params: { machineId, mark: true },
        });

        const processOrder = response.data[0];
        delete processOrder.marked;

        if (processOrder) {
            const processOrderId = processOrder.order_id;
            oeeLogger.info(`Process Order End for ProcessOrderID: ${processOrderId}`);
            processOrder.ActualProcessOrderEnd = timestamp;

            await apiClient.put(`/processorders/${processOrderId}`, processOrder);
            oeeLogger.info(`Updated ActualProcessOrderEnd for ProcessOrderID: ${processOrderId} to ${timestamp}`);
        } else {
            oeeLogger.warn(`No active process order found for machineId: ${machineId}`);
        }
    } catch (error) {
        errorLogger.error(`Failed to update ActualProcessOrderEnd for machineId ${machineId}: ${error.message}`);
    }
}

/**
 * Logs an error message.
 * @param {string} message - The error message to log.
 * @param {Error} [error] - The error object containing details about the error.
 */
function logError(message, error) {
    const fullMessage = `${message}${error ? `: ${error.message}` : ""}`;
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
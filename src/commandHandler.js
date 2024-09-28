const axios = require("axios");
const moment = require("moment-timezone");
const { v4: uuidv4 } = require("uuid");
const { oeeLogger, errorLogger } = require("../utils/logger");
const { saveMachineStoppagesData } = require("./dataLoader");
const { sendWebSocketMessage } = require("../websocket/webSocketUtils");

const TIMEZONE = process.env.TIMEZONE || "UTC";
const OEE_API_URL = process.env.OEE_API_URL || "http://localhost:3000/api/v1";
let currentHoldStatus = {};

/**
 * Handles the "Hold" command, which places the machine on hold.
 * @param {number} value - The value indicating whether to hold the machine (1 for hold).
 * @param {string} machineId - The ID of the machine being put on hold.
 */
async function handleHoldCommand(value, machineId) {
    const timestamp = moment().tz(TIMEZONE).toISOString();
    console.log(
        `handleHoldCommand called with value: ${value}, machineId: ${machineId}, timestamp: ${timestamp}`
    );

    if (value !== 1) {
        logInfo("Hold command received, but value is not 1");
        return;
    }

    logInfo("Machine is on Hold");
    stopMachineOperations();
    logEventToDatabase("Hold", timestamp);
    notifyPersonnel("Machine has been put on hold.");

    // Store the hold start time and related information
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
    console.log(
        `handleUnholdCommand called with value: ${value}, machineId: ${machineId}`
    );

    if (value !== 1) {
        logInfo("Unhold command received, but value is not 1");
        return;
    }

    const holdStatus = currentHoldStatus[machineId];
    if (!holdStatus || !holdStatus.startTimestamp) {
        logInfo(
            `Unhold command received, but no previous Hold signal found for machine ${machineId}.`
        );
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
        Reason: "TBD", // Placeholder for the reason, to be updated later
        Differenz: downtimeSeconds,
        machine_id: machineId,
    };

    logInfo(
        `Saving machine stoppage entry: ${JSON.stringify(machineStoppageEntry)}`
    );

    try {
        const Microstops = saveMachineStoppagesData(machineStoppageEntry);
        logInfo(`Microstops updated successfully: ${JSON.stringify(Microstops)}`);
        sendWebSocketMessage("Microstops", Microstops);
    } catch (error) {
        logError("Error saving Microstops data", error);
    }

    // Clear hold status after unhold
    delete currentHoldStatus[machineId];
}

/**
 * Updates the actual start time of a process order using the provided API.
 * @param {string} machineId - The ID of the machine starting the process order.
 */
async function handleProcessOrderStartCommand(machineId) {
    const timestamp = moment().tz(TIMEZONE).toISOString();
    console.log(
        `handleProcessOrderStart called for machineId: ${machineId} at ${timestamp}`
    );

    try {
        // Get the current process order associated with the machine
        const response = await axios.get(`${OEE_API_URL}/processorders/rel`, {
            params: { machineId, mark: true },
        });

        const processOrder = response.data[0];
        // Remove the "marked" field from the processOrder object
        delete processOrder.marked;
        console.log(processOrder);

        if (processOrder) {
            const processOrderId = processOrder.order_id;
            console.log(`Process Order Start for ProcessOrderID: ${processOrderId}`);

            // Update the ActualProcessOrderStart field
            processOrder.ActualProcessOrderStart = timestamp;

            // Send the updated process order back to the server with a PUT request
            await axios.put(
                `${OEE_API_URL}/processorders/${processOrderId}`,
                processOrder
            );

            oeeLogger.info(
                `Updated ActualProcessOrderStart for ProcessOrderID: ${processOrderId} to ${timestamp}`
            );
        } else {
            oeeLogger.warn(
                `No active process order found for machineId: ${machineId}`
            );
        }
    } catch (error) {
        errorLogger.error(
            `Failed to update ActualProcessOrderStart for machineId ${machineId}: ${error.message}`
        );
    }
}

/**
 * Updates the actual end time of a process order using the provided API.
 * @param {string} machineId - The ID of the machine ending the process order.
 */
async function handleProcessOrderEndCommand(machineId) {
    const timestamp = moment().tz(TIMEZONE).toISOString();
    console.log(
        `handleProcessOrderEnd called for machineId: ${machineId} at ${timestamp}`
    );

    try {
        // Get the current process order associated with the machine
        const response = await axios.get(`${OEE_API_URL}/processorders/rel`, {
            params: { machineId, mark: true },
        });

        const processOrder = response.data[0];
        delete processOrder.marked;

        if (processOrder) {
            const processOrderId = processOrder.order_id;
            console.log(`Process Order End for ProcessOrderID: ${processOrderId}`);

            // Update the ActualProcessOrderEnd field
            processOrder.ActualProcessOrderEnd = timestamp;

            // Send the updated process order back to the server with a PUT request
            await axios.put(
                `${OEE_API_URL}/processorders/${processOrderId}`,
                processOrder
            );

            oeeLogger.info(
                `Updated ActualProcessOrderEnd for ProcessOrderID: ${processOrderId} to ${timestamp}`
            );
        } else {
            oeeLogger.warn(
                `No active process order found for machineId: ${machineId}`
            );
        }
    } catch (error) {
        errorLogger.error(
            `Failed to update ActualProcessOrderEnd for machineId ${machineId}: ${error.message}`
        );
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
  console.log(`ERROR: ${fullMessage}`); // Ausgabe in der Konsole
}

/**
 * Logs an informational message.
 * @param {string} message - The informational message to log.
 */
function logInfo(message) {
  oeeLogger.info(message);
  console.log(`INFO: ${message}`); // Ausgabe in der Konsole
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
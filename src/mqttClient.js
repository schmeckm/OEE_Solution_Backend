// This code is responsible for setting up the MQTT client, handling incoming messages, and subscribing to machine topics.
// It builds the connection to the IT-OT Layer to read the data from the machines and process it.
// Configuration is read from the config file and the connection is established with the MQTT broker.

const mqtt = require("mqtt");
const { get: getSparkplugPayload } = require("sparkplug-payload");
const { oeeLogger, errorLogger, defaultLogger } = require("../utils/logger");
const { mqtt: mqttConfig } = require("../config/config");
const { handleCommandMessage, handleOeeMessage } = require("./messageHandler");
const { checkForRunningOrder, loadMachineData, getMachineIdFromLineCode } = require("./dataLoader");

const oeeConfig = require("../config/oeeConfig.json");
const axios = require('axios');
const { consoleLogger } = require("@influxdata/influxdb-client");

const OEE_API_URL = process.env.OEE_API_URL;
const API_KEY = process.env.API_KEY;
const WATCHDOG_INTERVAL = 60000; // 60 seconds

const apiClient = axios.create({
    baseURL: OEE_API_URL,
    headers: { 'x-api-key': API_KEY },
});

// Example of logging in error scenarios
try {
    throw new Error("Something went wrong!");
} catch (error) {
    errorLogger.error(`Caught an error: ${error.message}`);
}

const metrics = {
    messagesReceived: 0,
    reconnections: 0,
    lastConnectionTime: null,
    totalConnectionDuration: 0,
};

let lastMessageTimestamp = Date.now();
let client; // Deklaration der client-Variable im globalen Gültigkeitsbereich

/**
 * Sets up the MQTT client and its event handlers.
 * @returns {mqtt.MqttClient} The configured MQTT client.
 */
function setupMqttClient() {
    oeeLogger.info("Setting up MQTT client...");
    client = createMqttClient(); // Initialisierung der client-Variable
    setupClientEventHandlers(client);
    setupWatchdog(client);
    return client;
}

/**
 * Creates and connects the MQTT client.
 * @returns {mqtt.MqttClient} The connected MQTT client.
 */
function createMqttClient() {
    oeeLogger.info(`Connecting to MQTT broker at ${mqttConfig.brokers.area.url}...`);
    return mqtt.connect(mqttConfig.brokers.area.url, {
        username: mqttConfig.auth.username,
        password: mqttConfig.auth.password,
        clientId: mqttConfig.clientId,
        rejectUnauthorized: false
    });
}

/**
 * Sets up event handlers for the MQTT client.
 * @param {mqtt.MqttClient} client - The MQTT client.
 */
function setupClientEventHandlers(client) {
    client.on("connect", onConnect(client));
    client.on("message", handleIncomingMessage);
    client.on("error", handleClientError);
    client.on("reconnect", handleClientReconnect);
    client.on("close", handleClientClose);
    client.on("subscribe", onSubscribe);
}

/**
 * Handles the MQTT client's connection event.
 * @param {mqtt.MqttClient} client - The MQTT client.
 * @returns {Function} The event handler function.
 */
function onConnect(client) {
    return () => {
        oeeLogger.info("MQTT client connected successfully.");
        metrics.lastConnectionTime = Date.now();
        tryToSubscribeToMachineTopics(client);
    };
}

/**
 * Tries to subscribe to the machine topics in batches.
 * @param {mqtt.MqttClient} client - The MQTT client.
 */
async function tryToSubscribeToMachineTopics(client) {
    try {
        const machines = await loadMachineData();
        const oeeMachines = machines.filter(machine => machine.OEE);
        oeeLogger.debug(`Found ${oeeMachines.length} OEE-enabled machines.`);

        await Promise.all(oeeMachines.map(machine => subscribeToMachineTopics(client, machine)));
        oeeLogger.info(`Successfully subscribed to topics for all OEE-enabled machines.`);
    } catch (error) {
        oeeLogger.error(`Error in tryToSubscribeToMachineTopics: ${error.message}`);
    }
}

// The function will be called every 60 seconds to ensure that in the meantime a machine was set up in the system 
// OEE is enabled and the topics are subscribed to
setInterval(() => {
    tryToSubscribeToMachineTopics(client);
}, WATCHDOG_INTERVAL);

/**
 * Subscribes to the MQTT topics for a machine.
 * @param {mqtt.MqttClient} client - The MQTT client.
 * @param {Object} machine - The machine object.
 */
async function subscribeToMachineTopics(client, machine) {
    try {
        oeeLogger.debug(`Subscribing to topics for machine: ${machine.name}`);
        
        // Generieren der MQTT-Themen für die Maschine
        const topics = generateMachineTopics(machine);
        oeeLogger.debug(`Generated topics for machine ${machine.name}: ${JSON.stringify(topics)}`);
        
        // Abonnieren der Themen
        await Promise.all(topics.map(topic => subscribeWithRetry(client, topic, 3, 1000)));
        
        oeeLogger.info(`Successfully subscribed to topics for machine: ${machine.name}`);
    } catch (error) {
        oeeLogger.error(`Failed to subscribe to topics for machine ${machine.name}: ${error.message}`);
        throw error;
    }
}

/**
 * Generates dynamically the MQTT topics for a machine.
 * @param {Object} machine - The machine object.
 * @returns {Array<string>} The generated topics.
 */
function generateMachineTopics(machine) {
    const topics = [];
    if (!oeeConfig) {
        oeeLogger.info("oeeConfig is undefined or null. Please check the configuration file.");
        return topics;
    }

    if (!(machine?.plant && machine?.area && machine?.name)) {
        oeeLogger.error("Machine object is missing required properties.");
        return topics;
    }

    Object.keys(oeeConfig).forEach(key => {
        const topicType = ["Hold", "Unhold", "Start", "End"].includes(key) ? "DCMD" : "DDATA";
        topics.push(`spBv1.0/${machine.plant}/${machine.area}/${topicType}/${machine.name}/${key}`);
    });
    return topics;
}

/**
 * Handles the MQTT client's subscription event.
 * @param {Array<string>} topics - The subscribed topics.
 */
function onSubscribe(topics) {
    oeeLogger.debug(`Successfully subscribed to topics: ${topics}`);
}

/**
 * Handles incoming MQTT messages.
 * @param {string} topic - The topic of the message.
 * @param {Buffer} message - The message payload.
 */
async function handleIncomingMessage(topic, message) {
    metrics.messagesReceived++;
    lastMessageTimestamp = Date.now();
    const { machineName, dataType, metric } = parseTopic(topic);
    oeeLogger.info(`Received message on topic: ${topic} - machine=${machineName}, metric=${metric}`);

    try {
        const machineId = await getMachineIdFromLineCode(machineName);
        if (!machineId) {
            oeeLogger.error(`Machine ${machineName} not found. Skipping message processing.`);
            return;
        }
        oeeLogger.info(`Machine ID Incoming Message for ${machineName} is ${machineId}`);
        const hasRunningOrder = await checkForRunningOrder(machineId);
        if (!hasRunningOrder) {
            oeeLogger.warn(`No active process order for machine ID ${machineId}. Skipping message processing.`);
            return;
        }
        // Nachricht dekodieren und verarbeiten
        const decodedMessage = decodeMessagePayload(message);
        processMessageByType(dataType, decodedMessage, machineId, metric);

    } catch (error) {
        oeeLogger.error(`Error processing message for machine ${machineName}: ${error.message}`);
    }
}

/**
 * Processes the message based on its type.
 * @param {string} dataType - The type of the data.
 * @param {Object} decodedMessage - The decoded message.
 * @param {string} machineId - The ID of the machine.
 * @param {string} metric - The metric of the message.
 */
function processMessageByType(dataType, decodedMessage, machineId, metric) {
    if (dataType === "DCMD") {
        handleCommandMessage(decodedMessage, machineId, metric);
    } else if (dataType === "DDATA") {
        handleOeeMessage(decodedMessage, machineId, metric);
    } else {
        oeeLogger.warn(`Unknown data type in topic: ${dataType}`);
    }
}

/**
 * Decodes the message payload using Sparkplug.
 * @param {Buffer} message - The message payload.
 * @returns {Object} The decoded message.
 */
function decodeMessagePayload(message) {
    const sparkplug = getSparkplugPayload("spBv1.0");
    const decodedMessage = sparkplug.decodePayload(message);
    return decodedMessage;
}

/**
 * Logs an error that occurred while processing a message.
 * @param {string} topic - The topic of the message.
 * @param {Buffer} message - The message payload.
 * @param {Error} error - The error that occurred.
 */
function logError(topic, message, error) {
    errorLogger.error(`Error processing message on topic ${topic}: ${error.message}`);
    errorLogger.error(`Received message content: ${message.toString()}`);
}

/**
 * Parses the topic into its components.
 * @param {string} topic - The topic string.
 * @returns {Object} The parsed topic components.
 */
function parseTopic(topic) {
    const [version, location, area, dataType, machineName, metric] = topic.split("/");
    return { version, location, area, dataType, machineName, metric };
}

/**
 * Subscribes to a topic with entries and show them in the console. If more than one machine is available, 
 * the first one is used.
 * @param {mqtt.MqttClient} client - The MQTT client.
 * @param {string} topic - The topic to subscribe to.
 * @param {number} retries - The number of retries.
 * @param {number} baseDelay - The base delay for retries.
 * @returns {Promise<boolean>} True if subscription was successful, false otherwise.
 */
async function subscribeWithRetry(client, topic, retries = 5, baseDelay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            client.subscribe(topic);
            oeeLogger.info(`Successfully subscribed to topic: ${topic}`);
            return true;
        } catch (err) {
            const delay = getExponentialBackoffDelay(baseDelay, i);
            oeeLogger.warn(`Failed to subscribe to topic: ${topic}. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    oeeLogger.error(`Failed to subscribe to topic: ${topic} after ${retries} attempts.`);
    return false;
}

/**
 * Calculates the exponential backoff delay.
 * @param {number} baseDelay - The base delay.
 * @param {number} attempt - The current attempt number.
 * @returns {number} The calculated delay.
 */
function getExponentialBackoffDelay(baseDelay, attempt) {
    const maxJitter = baseDelay * (2 ** attempt);
    return Math.random() * maxJitter;
}

/**
 * Sets up a watchdog to monitor the MQTT client.
 * @param {mqtt.MqttClient} client - The MQTT client.
 */
function setupWatchdog(client) {
    setInterval(() => {
        const timeSinceLastMessage = Date.now() - lastMessageTimestamp;
        if (timeSinceLastMessage > WATCHDOG_INTERVAL) {
            oeeLogger.warn("No messages received for over 60 seconds. Attempting to reconnect...");
            client.reconnect();
        }
    }, WATCHDOG_INTERVAL);
}

/**
 * Handles the MQTT client's error event.
 * @param {Error} error - The error that occurred.
 */
function handleClientError(error) {
    oeeLogger.error(`MQTT client error: ${error.message}`);
}

/**
 * Handles the MQTT client's reconnect event.
 */
function handleClientReconnect() {
    metrics.reconnections++;
    oeeLogger.warn("MQTT client reconnecting...");
}

/**
 * Handles the MQTT client's close event.
 */
function handleClientClose() {
    if (metrics.lastConnectionTime) {
        metrics.totalConnectionDuration += Date.now() - metrics.lastConnectionTime;
    }
    oeeLogger.warn("MQTT client connection closed");
}

/**
 * Checks if a process order is active for a machine.
 * @param {string} machineId - The ID of the machine.
 * @returns {Promise<boolean>} True if a process order is active, false otherwise.
 */
const processOrderCache = new Map();
const processOrderFetchTime = new Map();
const PROCESS_ORDER_CACHE_DURATION = 5 * 60 * 1000; // Cache duration in milliseconds (e.g., 5 minutes)

module.exports = { setupMqttClient };
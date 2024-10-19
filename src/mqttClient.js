const mqtt = require("mqtt");
const { get: getSparkplugPayload } = require("sparkplug-payload");
const { oeeLogger, errorLogger, defaultLogger } = require("../utils/logger");
const { mqtt: mqttConfig } = require("../config/config");
const { handleCommandMessage, handleOeeMessage } = require("./messageHandler");
const oeeConfig = require("../config/oeeConfig.json");
const {
    checkForRunningOrder,
    loadMachineData,
    getMachineIdFromLineCode,
} = require("./dataLoader");

const metrics = {
    messagesReceived: 0,
    reconnections: 0,
    lastConnectionTime: null,
    totalConnectionDuration: 0,
};

let lastMessageTimestamp = Date.now();
const watchdogInterval = 60000; // 60 seconds

/**
 * Sets up the MQTT client, connects to the broker, and subscribes to relevant topics.
 * @returns {mqtt.Client} The initialized MQTT client.
 */
function setupMqttClient() {
    oeeLogger.info("Setting up MQTT client...");
    const client = createMqttClient();
    setupClientEventHandlers(client);
    setupWatchdog(client);
    return client;
}

/**
 * Creates an MQTT client and connects to the broker.
 * @returns {mqtt.Client} The MQTT client instance.
 */
function createMqttClient() {
    return mqtt.connect(mqttConfig.brokers.area.url, {
        username: mqttConfig.auth.username,
        password: mqttConfig.auth.password,
        key: mqttConfig.tls.key,
        cert: mqttConfig.tls.cert,
        ca: mqttConfig.tls.ca,
    });
}

/**
 * Sets up event handlers for the MQTT client.
 * @param {mqtt.Client} client - The MQTT client instance.
 */
function setupClientEventHandlers(client) {
    client.on("connect", () => {
        oeeLogger.info("MQTT client connected");
        metrics.lastConnectionTime = Date.now();
        tryToSubscribeToMachineTopics(client);
    });

    client.on("message", handleIncomingMessage);
    client.on("error", handleClientError);
    client.on("reconnect", handleClientReconnect);
    client.on("close", handleClientClose);
}

/**
 * Handles incoming MQTT messages.
 * @param {string} topic - The topic of the incoming message.
 * @param {Buffer} message - The message payload.
 */
async function handleIncomingMessage(topic, message) {
    metrics.messagesReceived++;
    lastMessageTimestamp = Date.now();

    const { machineName, dataType, metric } = parseTopic(topic);
    oeeLogger.info(`Received message on topic ${topic}: machine=${machineName}, metric=${metric}`);

    try {
        const machineId = await validateMachineId(machineName);
        const hasRunningOrder = await checkForRunningOrder(machineId);
        if (!hasRunningOrder) {
            oeeLogger.error(`No running order found for machine ${machineName} (machine_id=${machineId}). Skipping OEE calculation.`);
            return;
        }

        const sparkplug = getSparkplugPayload("spBv1.0");
        const decodedMessage = sparkplug.decodePayload(message);

        if (dataType === "DCMD") {
            handleCommandMessage(decodedMessage, machineId, metric);
        } else if (dataType === "DDATA") {
            handleOeeMessage(decodedMessage, machineId, metric);
        } else {
            oeeLogger.warn(`Unknown data type in topic: ${dataType}`);
        }
    } catch (error) {
        errorLogger.error(`Error processing message on topic ${topic}: ${error.message}`);
        errorLogger.error(`Received message content: ${message.toString()}`);
    }
}

/**
 * Parses the topic to extract relevant information.
 * @param {string} topic - The MQTT topic string.
 * @returns {Object} An object containing parsed topic parts.
 */
function parseTopic(topic) {
    const [version, location, area, dataType, machineName, metric] = topic.split("/");
    return { version, location, area, dataType, machineName, metric };
}

/**
 * Validates and retrieves the machine ID for a given machine name.
 * @param {string} machineName - The name of the machine.
 * @returns {Promise<string>} The machine ID.
 */
async function validateMachineId(machineName) {
    try {
        const machineId = await getMachineIdFromLineCode(machineName);
        if (!machineId || typeof machineId !== "string") {
            throw new Error(`Invalid machine ID: ${machineId}`);
        }
        return machineId;
    } catch (error) {
        oeeLogger.error(`Failed to retrieve machine ID for ${machineName}: ${error.message}`);
        throw error;
    }
}

/**
 * Subscribes the MQTT client to relevant topics for OEE-enabled machines.
 * @param {mqtt.Client} client - The MQTT client instance.
 */
async function tryToSubscribeToMachineTopics(client, batchSize = 10) {
    try {
        const allMachines = await loadMachineData();
        const oeeEnabledMachines = allMachines.filter((machine) => machine.OEE === true);

        // Batching für bessere Performance
        for (let i = 0; i < oeeEnabledMachines.length; i += batchSize) {
            const batch = oeeEnabledMachines.slice(i, i + batchSize);
            await Promise.all(batch.map(async(machine) => {
                const topics = generateMqttTopics(machine);
                await Promise.all(topics.map((topic) => subscribeWithRetry(client, topic, 5, 1000)));
            }));
        }

        oeeLogger.info("All machines processed for MQTT topics subscription.");
    } catch (error) {
        oeeLogger.error(`Error in tryToSubscribeToMachineTopics: ${error.message}`);
    }
}

/**
 * Generates the MQTT topics for a given machine based on OEE configuration.
 * @param {Object} machine - The machine object containing plant and area information.
 * @returns {string[]} An array of MQTT topics.
 */
function generateMqttTopics(machine) {
    const topics = [];
    if (!oeeConfig) {
        oeeLogger.info("oeeConfig is undefined or null. Please check the configuration file.");
        return topics;
    }

    Object.keys(oeeConfig).forEach((key) => {
        const topicType = ["Hold", "Unhold", "Start", "End"].includes(key) ? "DCMD" : "DDATA";
        topics.push(`spBv1.0/${machine.Plant}/${machine.area}/${topicType}/${machine.name}/${key}`);
    });
    console.log(topics);
    return topics;
}

/**
 * Subscribes to an MQTT topic with retry logic in case of failure.
 * @param {mqtt.Client} client - The MQTT client instance.
 * @param {string} topic - The MQTT topic to subscribe to.
 * @param {number} [retries=5] - The number of retries before giving up.
 * @param {number} [baseDelay=1000] - The initial delay between retries in milliseconds.
 * @returns {Promise<boolean>} A promise that resolves to true if subscription succeeds, otherwise false.
 */
async function subscribeWithRetry(client, topic, retries = 5, baseDelay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            oeeLogger.info(`Successfully subscribed to topic: ${topic}`);
            await client.subscribe(topic);
            return true;
        } catch (err) {
            const delay = getExponentialBackoffDelay(baseDelay, i);
            oeeLogger.info(`Failed to subscribe to topic: ${topic}. Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    oeeLogger.error(`Failed to subscribe to topic: ${topic} after ${retries} attempts.`);
    return false;
}

/**
 * Calculates an exponential backoff delay with jitter.
 * @param {number} baseDelay - The base delay in milliseconds.
 * @param {number} attempt - The current retry attempt number.
 * @returns {number} The calculated delay with jitter.
 */
function getExponentialBackoffDelay(baseDelay, attempt) {
    const maxJitter = baseDelay * (2 ** attempt);
    return Math.random() * maxJitter;
}

/**
 * Sets up a watchdog to monitor MQTT message activity.
 * @param {mqtt.Client} client - The MQTT client instance.
 */
function setupWatchdog(client) {
    setInterval(() => {
        const timeSinceLastMessage = Date.now() - lastMessageTimestamp;
        if (timeSinceLastMessage > watchdogInterval) {
            oeeLogger.warn("No messages received for over 60 seconds. Attempting to reconnect...");
            client.reconnect();
        }
    }, watchdogInterval);
}

/**
 * Handles MQTT client error events.
 * @param {Error} error - The error object.
 */
function handleClientError(error) {
    oeeLogger.error(`MQTT client error: ${error.message}`);
}

/**
 * Handles MQTT client reconnect events.
 */
function handleClientReconnect() {
    metrics.reconnections++;
    oeeLogger.warn("MQTT client reconnecting...");
}

/**
 * Handles MQTT client close events.
 */
function handleClientClose() {
    if (metrics.lastConnectionTime) {
        metrics.totalConnectionDuration += Date.now() - metrics.lastConnectionTime;
    }
    oeeLogger.warn("MQTT client connection closed");
}

module.exports = { setupMqttClient };
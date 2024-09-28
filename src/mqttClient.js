const mqtt = require("mqtt");
const { get: getSparkplugPayload } = require("sparkplug-payload");
const { oeeLogger, errorLogger } = require("../utils/logger");
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
  const client = mqtt.connect(mqttConfig.brokers.area.url, {
    username: mqttConfig.auth.username,
    password: mqttConfig.auth.password,
    key: mqttConfig.tls.key,
    cert: mqttConfig.tls.cert,
    ca: mqttConfig.tls.ca,
  });

  client.on("connect", () => {
    oeeLogger.info("MQTT client connected");
    metrics.lastConnectionTime = Date.now();
    tryToSubscribeToMachineTopics(client);
  });

  client.on("message", async (topic, message) => {
    metrics.messagesReceived++;
    lastMessageTimestamp = Date.now();
    let machineId; // Machine ID hier außerhalb definieren
    try {
      const topicParts = topic.split("/");
      const [version, location, area, dataType, machineName, metric] =
        topicParts;
      oeeLogger.info(
        `Received message on topic ${topic}: machine=${machineName}, metric=${metric}`
      );

      try {
        machineId = await getMachineIdFromLineCode(machineName); // Keine erneute Definition innerhalb des Blocks

        if (typeof machineId === "undefined") {
          oeeLogger.error(
            `Undefined machine ID returned for machine name: ${machineName}`
          );
          return;
        }

        if (!machineId || typeof machineId !== "string") {
          oeeLogger.error(
            `Invalid machine ID (${machineId}) returned for machine name: ${machineName}`
          );
          return;
        }

        oeeLogger.info(
          `Machine ID ${machineId} successfully retrieved for machine name: ${machineName}`
        );
      } catch (error) {
        oeeLogger.error(
          `Failed to retrieve machine ID for machine name: ${machineName} due to error: ${error.message}`
        );
        oeeLogger.error(error.stack);
        return;
      }

      const hasRunningOrder = await checkForRunningOrder(machineId);
      if (!hasRunningOrder) {
        oeeLogger.error(
          `No running order found for machine ${machineName} (machine_id=${machineId}). Skipping OEE calculation.`
        );
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
      errorLogger.error(
        `Error processing message on topic ${topic}: ${error.message}`
      );
      errorLogger.error(`Received message content: ${message.toString()}`);
    }
  });

  client.on("error", (error) => {
    oeeLogger.error(`MQTT client error: ${error.message}`);
  });

  client.on("reconnect", () => {
    metrics.reconnections++;
    oeeLogger.warn("MQTT client reconnecting...");
  });

  client.on("close", () => {
    if (metrics.lastConnectionTime) {
      metrics.totalConnectionDuration +=
        Date.now() - metrics.lastConnectionTime;
    }
    oeeLogger.warn("MQTT client connection closed");
  });

  setInterval(() => {
    if (Date.now() - lastMessageTimestamp > watchdogInterval) {
      oeeLogger.warn(
        "No messages received for over 60 seconds. Resetting MQTT connection."
      );
      client.end(true, () => setupMqttClient()); // Force reconnection
    }
  }, watchdogInterval);

  return client;
}

/**
 * Subscribes the MQTT client to relevant topics for OEE-enabled machines.
 * @param {mqtt.Client} client - The MQTT client instance.
 */
async function tryToSubscribeToMachineTopics(client) {
  try {
    // Maschinendaten asynchron laden
    const allMachines = await loadMachineData();

    // Maschinen mit aktiviertem OEE filtern
    const oeeEnabledMachines = allMachines.filter(
      (machine) => machine.OEE === true
    );

    // Funktion zur rekursiven Verarbeitung der Maschinen
    function tryNextMachine(index) {
      if (index >= oeeEnabledMachines.length) {
        oeeLogger.info("All machines processed for MQTT topics subscription.");
        return;
      }

      const machine = oeeEnabledMachines[index];
      const topics = generateMqttTopics(machine);
      let pendingSubscriptions = topics.length;

      topics.forEach((topic) => {
        subscribeWithRetry(client, topic, 5, 1000).then((success) => {
          pendingSubscriptions--;
          if (pendingSubscriptions === 0 && !success) {
            oeeLogger.error(
              `Failed to subscribe to any topic for machine ${machine.name}. Trying next machine...`
            );
          }
          if (pendingSubscriptions === 0) {
            tryNextMachine(index + 1);
          }
        });
      });
    }

    // Beginne die Verarbeitung der Maschinen ab Index 0
    tryNextMachine(0);
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
    oeeLogger.error(
      "oeeConfig is undefined or null. Please check the configuration file."
    );
    return topics;
  }

  Object.keys(oeeConfig).forEach((key) => {
    const topicType = ["Hold", "Unhold", "Start", "End"].includes(key)
      ? "DCMD"
      : "DDATA";
    topics.push(
      `spBv1.0/${machine.Plant}/${machine.area}/${topicType}/${machine.name}/${key}`
    );
  });

  return topics;
}

/**
 * Subscribes to an MQTT topic with retry logic in case of failure.
 * @param {mqtt.Client} client - The MQTT client instance.
 * @param {string} topic - The MQTT topic to subscribe to.
 * @param {number} [retries=5] - The number of retries before giving up.
 * @param {number} [delay=1000] - The initial delay between retries in milliseconds.
 * @returns {Promise<boolean>} A promise that resolves to true if subscription succeeds, otherwise false.
 */
async function subscribeWithRetry(client, topic, retries = 5, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      await client.subscribe(topic);
      oeeLogger.info(`Successfully subscribed to topic: ${topic}`);
      return true;
    } catch (err) {
      oeeLogger.warn(
        `Failed to subscribe to topic: ${topic}. Retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  oeeLogger.error(
    `Failed to subscribe to topic: ${topic} after ${retries} attempts.`
  );
  return false;
}

module.exports = { setupMqttClient };

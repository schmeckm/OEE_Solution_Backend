// This code is responsible for initializing the MQTT client.
const { setupMqttClient } = require('./mqttClient');
const { oeeLogger, errorLogger, defaultLogger } = require("../utils/logger");

/**
 * Funktion zur Initialisierung des MQTT-Clients.
 * @returns {Object|null} - Gibt den MQTT-Client zurück oder null, wenn die Initialisierung fehlschlägt.
 */
function initializeMqttClient() {
    let mqttClient = null;
    try {
        mqttClient = setupMqttClient();
        if (mqttClient) {
            defaultLogger.info('MQTT client initialized successfully.');
        } else {
            errorLogger.error('MQTT client initialization failed (setupMqttClient returned null).');
        }
    } catch (error) {
        // Logge den gesamten Fehler (einschließlich des Stacktraces), um mehr Kontext zu erhalten
        errorLogger.error('Error during MQTT client initialization:', error);
        // mqttClient bleibt null, signalisiert den Fehler
    }
    return mqttClient;
}

module.exports = initializeMqttClient;

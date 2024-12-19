const { setupMqttClient } = require('./mqttClient');
const { oeeLogger, errorLogger, defaultLogger } = require("../utils/logger");
/**
 * Funktion zur Initialisierung des MQTT-Clients.
 * @returns {Object|null} - Gibt den MQTT-Client zurück oder null, wenn die Initialisierung fehlschlägt.
 */
function initializeMqttClient() {
    let mqttClient;
    try {
        mqttClient = setupMqttClient();
        defaultLogger.info('MQTT client initialized successfully.');
    } catch (error) {
        // Logge den gesamten Fehler (einschließlich des Stacktraces), um mehr Kontext zu erhalten
        errorLogger.error('Error initializing MQTT client:', error);
        mqttClient = null; // Falls die Initialisierung fehlschlägt, geben wir null zurück
    }
    return mqttClient;
}

module.exports = initializeMqttClient;

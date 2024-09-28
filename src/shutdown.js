const { defaultLogger } = require('../utils/logger');

/**
 * Gracefully shuts down the server.
 * 
 * @param {Object} server - HTTP server instance.
 * @param {Object} mqttClient - MQTT client instance.
 * @param {string} signal - The signal received for shutdown.
 */
function gracefulShutdown(server, mqttClient, signal) {
    defaultLogger.info(`${signal} signal received: closing HTTP server`);
    server.close(() => {
        defaultLogger.info('HTTP server closed');
        if (mqttClient) {
            mqttClient.end(() => {
                defaultLogger.info('MQTT client disconnected');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    });
}

module.exports = gracefulShutdown;
const cron = require('node-cron');
const { defaultLogger, errorLogger } = require('../utils/logger');
const { cleanupLogs } = require('../utils/logger');

/**
 * Funktion zum Starten des Cron-Jobs für die Log-Bereinigung.
 * @param {number} logRetentionDays - Die Anzahl der Tage, für die Logs aufbewahrt werden.
 */
function startLogCleanupJob(logRetentionDays) {
    cron.schedule('0 0 * * *', async() => {
        try {
            await cleanupLogs(logRetentionDays);
            defaultLogger.info('Old logs cleanup job completed successfully.');
        } catch (error) {
            errorLogger.error('Error during log cleanup job:', error.message);
        }
    });
}

module.exports = startLogCleanupJob;
// utils/logEnv.js

const { defaultLogger } = require("./logger"); // Stellen Sie sicher, dass Ihr Logger korrekt importiert ist

function logEnvVariables() {
    defaultLogger.info('🔍 Aktuelle Umgebungsvariablen:');
    for (const [key, value] of Object.entries(process.env)) {
        // Liste der sensiblen Variablen, die maskiert werden sollen
        const sensitiveKeys = ['API_KEY', 'GOOGLE_CLIENT_SECRET', 'AUTH0_CLIENT_SECRET', 'DATABASE_URL'];
        
        if (sensitiveKeys.includes(key)) {
            defaultLogger.info(`${key}=**** (masked)`);
        } else {
            defaultLogger.info(`${key}=${value}`);
        }
    }
}

module.exports = logEnvVariables;

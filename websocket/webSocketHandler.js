const { defaultLogger, errorLogger } = require('../utils/logger');

/**
 * Funktion zur Verarbeitung von WebSocket-Verbindungen.
 * 
 * @param {Object} wss - WebSocket-Server-Instanz.
 */
function handleWebSocketConnections(wss) {
    wss.on('connection', (ws, req) => {
        defaultLogger.info('WebSocket connection established');

        ws.on('message', (message) => {
            const parsedMessage = JSON.parse(message);
            defaultLogger.info(`Received message: ${message}`);

            if (parsedMessage.type === 'updateRating') {
                const { ProcessOrderID, ID, Reason } = parsedMessage.data;
                saveRating(ProcessOrderID, ID, Reason, (error, updatedStoppages) => {
                    if (error) {
                        errorLogger.error(`Error saving rating: ${error.message}`);
                        return;
                    }

                    // Broadcast the updated data to all connected clients
                    wss.clients.forEach(client => {
                        if (client.readyState === ws.OPEN) {
                            client.send(JSON.stringify({ type: 'Microstops', data: updatedStoppages }));
                        }
                    });
                });
            }
        });

        ws.on('close', () => {
            defaultLogger.info('WebSocket connection closed');
        });
    });
}

module.exports = handleWebSocketConnections;
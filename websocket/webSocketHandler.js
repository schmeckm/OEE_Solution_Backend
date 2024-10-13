const { defaultLogger, errorLogger } = require('../utils/logger');

/**
 * Handles WebSocket connections and message processing.
 * 
 * @param {Object} wss - The WebSocket server instance.
 */
function handleWebSocketConnections(wss) {
    // Event listener for new WebSocket connections
    wss.on('connection', (ws, req) => {
        defaultLogger.info('WebSocket connection established');

        // Handle incoming messages from WebSocket clients
        ws.on('message', (message) => {
            try {
                const parsedMessage = JSON.parse(message); // Parse the received message
                defaultLogger.info(`Received message: ${message}`);

                // Check the message type and act accordingly
                if (parsedMessage.type === 'updateRating') {
                    const { ProcessOrderID, ID, Reason } = parsedMessage.data;

                    // Process and save the rating, handling any errors
                    saveRating(ProcessOrderID, ID, Reason, (error, updatedStoppages) => {
                        if (error) {
                            errorLogger.error(`Error saving rating: ${error.message}`);
                            return;
                        }

                        // Broadcast the updated data to all connected WebSocket clients
                        wss.clients.forEach(client => {
                            if (client.readyState === ws.OPEN) {
                                client.send(JSON.stringify({ type: 'Microstops', data: updatedStoppages }));
                            }
                        });
                    });
                }
            } catch (err) {
                errorLogger.error(`Error processing WebSocket message: ${err.message}`);
                ws.send(JSON.stringify({ error: 'Invalid message format' })); // Optional: Notify client of the error
            }
        });

        // Handle WebSocket connection closure
        ws.on('close', () => {
            defaultLogger.info('WebSocket connection closed');
        });

        // Handle WebSocket errors
        ws.on('error', (err) => {
            errorLogger.error(`WebSocket error: ${err.message}`);
        });
    });
}

module.exports = handleWebSocketConnections;
const { defaultLogger, errorLogger } = require('../utils/logger');

function handleWebSocketConnections(wss) {
    const PING_INTERVAL = 30000; // 30 seconds
    const PONG_TIMEOUT = 10000; // 10 seconds

    // Broadcast helper function
    function broadcast(wss, message) {
        wss.clients.forEach(client => {
            if (client.readyState === ws.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }

    // Log active connections
    function logActiveConnections(wss) {
        const activeConnections = Array.from(wss.clients).filter(client => client.readyState === ws.OPEN).length;
        defaultLogger.info(`Active WebSocket connections: ${activeConnections}`);
    }

    // Graceful shutdown
    function gracefulShutdown(wss) {
        defaultLogger.info('Shutting down WebSocket server...');
        clearInterval(interval);
        wss.clients.forEach(client => client.close());
        wss.close(() => defaultLogger.info('WebSocket server closed.'));
    }

    process.on('SIGINT', () => gracefulShutdown(wss));
    process.on('SIGTERM', () => gracefulShutdown(wss));

    // Handle new connections
    wss.on('connection', (ws, req) => {
        const clientId = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        defaultLogger.info(`WebSocket connection established from client: ${clientId}`);

        ws.isAlive = true;

        ws.on('pong', () => {
            ws.isAlive = true;
            clearTimeout(ws.pongTimeout);
        });

        const interval = setInterval(() => {
            wss.clients.forEach(client => {
                if (client.isAlive === false) {
                    client.terminate();
                    defaultLogger.info(`Terminated inactive client: ${clientId}`);
                } else {
                    client.isAlive = false;
                    client.ping();
                    client.pongTimeout = setTimeout(() => {
                        client.terminate();
                        defaultLogger.info(`Terminated client due to pong timeout: ${clientId}`);
                    }, PONG_TIMEOUT);
                }
            });
        }, PING_INTERVAL);

        ws.on('message', async (message) => {
            try {
                const parsedMessage = JSON.parse(message);
                defaultLogger.info(`Received message from ${clientId}: ${message}`);

                if (parsedMessage.type === 'updateRating') {
                    const { ProcessOrderID, ID, Reason } = parsedMessage.data;
                    const updatedStoppages = await saveRating(ProcessOrderID, ID, Reason);
                    broadcast(wss, { type: 'Microstops', data: updatedStoppages });
                }
            } catch (err) {
                errorLogger.error(`Error processing message from ${clientId}: ${err.message}`);
                ws.send(JSON.stringify({ error: 'Invalid message format' }));
            }
        });

        ws.on('close', () => {
            defaultLogger.info(`WebSocket connection closed for client: ${clientId}`);
            clearInterval(interval);
        });

        ws.on('error', (err) => {
            errorLogger.error(`WebSocket error for client ${clientId}: ${err.message}`);
        });
    });

    // Log active connections periodically
    setInterval(() => logActiveConnections(wss), 60000);
}

module.exports = handleWebSocketConnections;
const WebSocket = require("ws");
const { oeeLogger, errorLogger } = require("../utils/logger");
const { loadMicrostops } = require("../src/dataLoader");

let wsServer = null; // Holds the WebSocket server instance
let pingInterval = null; // Holds the ping interval

/**
 * Sets the WebSocket server and handles client connections.
 *
 * @param {WebSocket.Server} server - The WebSocket server instance.
 */
function setWebSocketServer(server) {
    if (!wsServer) {
        wsServer = server;
        oeeLogger.info("WebSocket server instance has been set.");

        // Start the ping interval to detect inactive clients
        startPingInterval();

        // Event listener for new client connections
        wsServer.on("connection", handleWebSocketConnection);
    } else {
        errorLogger.warn("WebSocket server instance is already set.");
    }
}

/**
 * Starts the ping interval to detect inactive clients.
 */
function startPingInterval() {
    pingInterval = setInterval(() => {
        if (wsServer) {
            wsServer.clients.forEach((client) => {
                if (client.isAlive === false) {
                    client.terminate(); // Terminate the connection if the client is unresponsive
                    oeeLogger.info('Terminated inactive WebSocket client connection.');
                } else {
                    client.isAlive = false;
                    client.ping(); // Send a ping to the client
                }
            });
        }
    }, 30000); // Ping every 30 seconds
}

/**
 * Handles new WebSocket client connections.
 *
 * @param {WebSocket} ws - The WebSocket client connection.
 */
async function handleWebSocketConnection(ws) {
    oeeLogger.info("Client connected via WebSocket.");

    // Initialize the ping/pong mechanism
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    // Send initial data to the newly connected client
    try {
        const machineStoppagesData = await loadMicrostops();
        sendWebSocketMessage("Microstops", machineStoppagesData);
        oeeLogger.info("Initial machine stoppage data sent to WebSocket client.");
    } catch (error) {
        errorLogger.error(`Error loading machine stoppage data: ${error.message}`);
    }

    // Event listener for client disconnection
    ws.on("close", () => {
        oeeLogger.info("WebSocket client disconnected.");
        stopPingIntervalIfNoClients(); // Stop the ping interval if no clients are connected
    });

    // Event listener for errors
    ws.on("error", (error) => {
        errorLogger.error(`WebSocket error: ${error.message}`);
    });
}

/**
 * Stops the ping interval if no clients are connected.
 */
function stopPingIntervalIfNoClients() {
    if (wsServer && wsServer.clients.size === 0) {
        clearInterval(pingInterval);
        pingInterval = null;
        oeeLogger.info("Ping interval stopped as no clients are connected.");
    }
}

/**
 * Sends data to all connected WebSocket clients with a specific type.
 *
 * @param {string} type - The type of data being sent.
 * @param {Object} data - The data to send.
 */
function sendWebSocketMessage(type, data) {
    if (!wsServer) {
        errorLogger.error("WebSocket server instance is not set.");
        return;
    }

    if (!type || !data) {
        errorLogger.error("Invalid parameters for sendWebSocketMessage: type and data are required.");
        return;
    }

    const payload = JSON.stringify({ type, data });

    wsServer.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(payload);
            } catch (error) {
                errorLogger.error(`Error sending data to WebSocket client: ${error.message}`);
            }
        }
    });
}

/**
 * Closes the WebSocket server and cleans up resources.
 */
function closeWebSocketServer() {
    if (wsServer) {
        wsServer.clients.forEach((client) => {
            client.terminate(); // Terminate all client connections
        });

        wsServer.close(() => {
            oeeLogger.info("WebSocket server has been closed.");
            wsServer = null;
        });

        if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
            oeeLogger.info("Ping interval stopped.");
        }
    } else {
        errorLogger.warn("WebSocket server instance is not set.");
    }
}

module.exports = {
    setWebSocketServer,
    sendWebSocketMessage,
    closeWebSocketServer,
};
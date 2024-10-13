const WebSocket = require("ws");
const { oeeLogger, errorLogger } = require("../utils/logger");
const { loadMachineStoppagesData } = require("../src/dataLoader");

let wsServer = null; // Holds the WebSocket server instance

/**
 * Sets the WebSocket server and handles client connections.
 *
 * @param {WebSocket.Server} server - The WebSocket server instance.
 */
function setWebSocketServer(server) {
    wsServer = server;

    wsServer.on("connection", async(ws) => {
        console.log("Client connected");
        oeeLogger.info("Client connected to WebSocket.");

        // Set up ping/pong mechanism to detect broken connections
        ws.isAlive = true;
        ws.on('pong', () => {
            ws.isAlive = true;
        });

        const interval = setInterval(() => {
            wsServer.clients.forEach((client) => {
                if (client.isAlive === false) {
                    client.terminate(); // Terminate the connection if the client did not respond
                    oeeLogger.info('Terminated inactive WebSocket client.');
                } else {
                    client.isAlive = false;
                    client.ping(); // Send a ping to the client
                }
            });
        }, 30000); // Ping every 30 seconds

        // Send initial machine stoppages data to the newly connected client
        try {
            const machineStoppagesData = await loadMachineStoppagesData();
            sendWebSocketMessage("Microstops", machineStoppagesData);
            oeeLogger.info("Initial machine stoppages data sent to WebSocket client.");
        } catch (error) {
            errorLogger.error(`Error sending initial machine stoppages data: ${error.message}`);
        }

        ws.on("close", () => {
            console.log("Client disconnected");
            oeeLogger.info("WebSocket client disconnected.");
            clearInterval(interval); // Stop the ping interval when the client disconnects
        });

        ws.on("error", (error) => {
            errorLogger.error(`WebSocket error: ${error.message}`);
        });
    });
}

/**
 * Send data to all connected WebSocket clients with a specified type.
 *
 * @param {string} type - The type of data being sent.
 * @param {Object} data - The data to send.
 */
function sendWebSocketMessage(type, data) {
    if (wsServer) {
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
    } else {
        errorLogger.error("WebSocket server instance is not set.");
    }
}

module.exports = {
    setWebSocketServer,
    sendWebSocketMessage,
};
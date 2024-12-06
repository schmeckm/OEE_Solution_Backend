// websocket/webSocketUtils.js

const WebSocket = require("ws");
const { oeeLogger, errorLogger } = require("../utils/logger");
const { loadMachineStoppagesData } = require("../src/dataLoader");

let wsServer = null; // Hält die WebSocket-Server-Instanz

/**
 * Setzt den WebSocket-Server und behandelt Client-Verbindungen.
 *
 * @param {WebSocket.Server} server - Die WebSocket-Server-Instanz.
 */
function setWebSocketServer(server) {
    if (!wsServer) {
        wsServer = server;
        oeeLogger.info("WebSocket-Server-Instanz wurde gesetzt.");
        wsServer.on("connection", async (ws) => {
            oeeLogger.info("Client mit WebSocket verbunden.");

            // Ping/Pong-Mechanismus zur Erkennung unterbrochener Verbindungen
            ws.isAlive = true;
            ws.on('pong', () => {
                ws.isAlive = true;
            });

            const interval = setInterval(() => {
                wsServer.clients.forEach((client) => {
                    if (client.isAlive === false) {
                        client.terminate(); // Verbindung beenden, wenn der Client nicht reagiert
                        oeeLogger.info('Inaktive WebSocket-Client-Verbindung beendet.');
                    } else {
                        client.isAlive = false;
                        client.ping(); // Ping an den Client senden
                    }
                });
            }, 30000); // Alle 30 Sekunden pingen

            // Initiale Daten an den neu verbundenen Client senden
            try {
                const machineStoppagesData = await loadMachineStoppagesData();
                sendWebSocketMessage("Microstops", machineStoppagesData);
                oeeLogger.info("Initiale Maschinenstoppdaten an WebSocket-Client gesendet.");
            } catch (error) {
                errorLogger.error(`Fehler beim Senden der initialen Maschinenstoppdaten: ${error.message}`);
            }

            ws.on("close", () => {
                oeeLogger.info("WebSocket-Client getrennt.");
                clearInterval(interval); // Ping-Intervall stoppen, wenn der Client trennt
            });

            ws.on("error", (error) => {
                errorLogger.error(`WebSocket-Fehler: ${error.message}`);
            });
        });
    } else {
        errorLogger.warn("WebSocket-Server-Instanz ist bereits gesetzt.");
    }
}

/**
 * Sendet Daten an alle verbundenen WebSocket-Clients mit einem bestimmten Typ.
 *
 * @param {string} type - Der Typ der gesendeten Daten.
 * @param {Object} data - Die zu sendenden Daten.
 */
function sendWebSocketMessage(type, data) {
    if (wsServer) {
        const payload = JSON.stringify({ type, data });

        wsServer.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(payload);
                } catch (error) {
                    errorLogger.error(`Fehler beim Senden der Daten an WebSocket-Client: ${error.message}`);
                }
            }
        });
    } else {
        errorLogger.error("WebSocket-Server-Instanz ist nicht gesetzt.");
    }
}

module.exports = {
    setWebSocketServer,
    sendWebSocketMessage,
};

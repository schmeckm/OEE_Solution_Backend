// server.js

// === Load Environment Variables ===
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Dynamically load .env file based on NODE_ENV
const env = process.env.NODE_ENV || 'development';
const envFilePath = path.resolve(__dirname, `.env.${env}`);

if (fs.existsSync(envFilePath)) {
    dotenv.config({ path: envFilePath });
    console.log(`✅ Umgebungsvariablen aus ${envFilePath} geladen.`);
} else {
    console.warn(`⚠️ Umgebungsdatei ${envFilePath} nicht gefunden. Standardvariablen werden verwendet.`);
    dotenv.config(); // Load default .env if exists
}

// === Import Logging Function ===
const logEnvVariables = require('./utils/logEnv'); // Stellen Sie sicher, dass diese Datei existiert

// Log environment variables
if (process.env.NODE_ENV === 'development') {
    logEnvVariables();
}

// === Import Required Modules ===
let express, helmet, rateLimit, https, WebSocketServer, swaggerJsDoc, swaggerUi, cors;

try {
    console.log('🔄 Importiere Express...');
    express = require("express");
    console.log('✅ Express erfolgreich importiert.');

    console.log('🔄 Importiere Helmet...');
    helmet = require("helmet");
    console.log('✅ Helmet erfolgreich importiert.');

    console.log('🔄 Importiere express-rate-limit...');
    rateLimit = require("express-rate-limit");
    console.log('✅ express-rate-limit erfolgreich importiert.');

    console.log('🔄 Importiere HTTPS...');
    https = require('https');
    console.log('✅ HTTPS erfolgreich importiert.');

    console.log('🔄 Importiere ws...');
    WebSocketServer = require("ws").Server;
    console.log('✅ ws erfolgreich importiert.');

    console.log('🔄 Importiere swagger-jsdoc...');
    swaggerJsDoc = require('swagger-jsdoc');
    console.log('✅ swagger-jsdoc erfolgreich importiert.');

    console.log('🔄 Importiere swagger-ui-express...');
    swaggerUi = require('swagger-ui-express');
    console.log('✅ swagger-ui-express erfolgreich importiert.');

    console.log('🔄 Importiere CORS...');
    cors = require('cors');
    console.log('✅ CORS erfolgreich importiert.');

} catch (error) {
    console.error('❌ Fehler beim Importieren von Modulen:', error);
    process.exit(1);
}

// === Initialize Express App ===
let app;
try {
    console.log('📝 Initialisiere Express App...');
    app = express();
    console.log('✅ Express App erfolgreich initialisiert.');
} catch (error) {
    console.error('❌ Fehler bei der Initialisierung der Express App:', error);
    process.exit(1);
}

// === Security Middleware ===
try {
    app.use(helmet());
    app.use(
        helmet.contentSecurityPolicy({
            useDefaults: true,
            directives: {
                "img-src": ["'self'", "https:", "data:", "https://lh3.googleusercontent.com"],
                "default-src": ["'self'"],
                "script-src": ["'self'"],
                "style-src": ["'self'"]
            }
        })
    );
    app.use(helmet.referrerPolicy({ policy: 'no-referrer' }));
    console.log('🔒 Helmet Sicherheits-Middleware initialisiert.');
} catch (error) {
    console.error('❌ Fehler beim Initialisieren der Sicherheits-Middleware:', error);
    process.exit(1);
}

// === CORS Configuration ===
try {
    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS || '*';
    app.use(cors({
        origin: allowedOrigins === '*' ? true : allowedOrigins.split(',')
    }));
    console.log(`🔗 CORS konfiguriert mit Ursprüngen: ${allowedOrigins}`);
} catch (error) {
    console.error('❌ Fehler bei der Konfiguration von CORS:', error);
    process.exit(1);
}

// === Middleware for Parsing JSON and Form Data ===
try {
    app.use(express.json({ limit: "10kb" }));
    app.use(express.urlencoded({ extended: true, limit: "10kb" }));
    app.use(express.static(path.join(__dirname, "public")));
    console.log('📦 Middleware für JSON und URL-codierte Daten erfolgreich initialisiert.');
} catch (error) {
    console.error('❌ Fehler beim Initialisieren der Datenparsing-Middleware:', error);
    process.exit(1);
}

// === Initialize InfluxDB (if used) ===
try {
    const { initializeInfluxDB } = require("./services/influxDBService");
    initializeInfluxDB();
    console.log('📈 InfluxDB erfolgreich initialisiert.');
} catch (error) {
    console.error('❌ Fehler bei der Initialisierung von InfluxDB:', error);
}

// === Logging Middleware ===
try {
    const { defaultLogger } = require("./utils/logger");
    app.use((req, res, next) => {
        defaultLogger.info(`[${new Date().toISOString()}] ${req.method} ${req.url} von ${req.ip}`);
        next();
    });
    console.log('📝 Logging-Middleware erfolgreich initialisiert.');
} catch (error) {
    console.error('❌ Fehler beim Einrichten der Logging-Middleware:', error);
    process.exit(1);
}

// === API Key Middleware for External Requests Only ===
try {
    const { defaultLogger } = require("./utils/logger");
    app.use((req, res, next) => {
        const apiKey = req.headers['x-api-key'];
        const clientIp = req.ip || req.socket.remoteAddress;
        const requestHostname = req.hostname;

        const isInternalRequest = ['::1', '127.0.0.1', 'localhost', process.env.INTERNAL_SERVER_IP].includes(clientIp) ||
            requestHostname === 'localhost' ||
            requestHostname === process.env.INTERNAL_SERVER_HOSTNAME;

        defaultLogger.info(`📍 Anfrage von IP: ${clientIp}, Hostname: ${requestHostname}, Intern: ${isInternalRequest}`);

        if (process.env.NODE_ENV === 'production' && !isInternalRequest && apiKey !== process.env.API_KEY) {
            defaultLogger.error('❌ Unautorisiert: Ungültiger API-Schlüssel bereitgestellt.');
            return res.status(401).json({ error: 'Unautorisiert: Ungültiger API-Schlüssel' });
        }

        next();
    });
    console.log('🔒 API-Key Middleware erfolgreich eingerichtet.');
} catch (error) {
    console.error('❌ Fehler beim Einrichten der API-Key Middleware:', error);
    process.exit(1);
}

// === Register API Routes ===
try {
    const registerApiRoutes = require("./routes/apiRoutes");
    registerApiRoutes(app);
    console.log('📁 API-Routen erfolgreich registriert.');
} catch (error) {
    console.error('❌ Fehler beim Registrieren der API-Routen:', error);
    process.exit(1);
}

// === Global Error Handling Middleware ===
try {
    const { defaultLogger } = require("./utils/logger");
    app.use((err, req, res, next) => {
        defaultLogger.error(`[${new Date().toISOString()}] Fehler: ${err.message}`);
        defaultLogger.error(err.stack);
        res.status(500).send("Etwas ist schief gelaufen!");
    });
    console.log('⚠️ Globale Fehlerbehandlungs-Middleware erfolgreich eingerichtet.');
} catch (error) {
    console.error('❌ Fehler beim Einrichten der globalen Fehlerbehandlung:', error);
    process.exit(1);
}

// === Log Cleanup Job ===
try {
    const startLogCleanupJob = require("./cronJobs/logCleanupJob");
    const logRetentionDays = process.env.LOG_RETENTION_DAYS || 7;
    startLogCleanupJob(logRetentionDays);
    console.log(`🧹 Log-Cleanup-Job gestartet. Logs älter als ${logRetentionDays} Tage werden gelöscht.`);
} catch (error) {
    console.error('❌ Fehler beim Starten des Log-Cleanup-Jobs:', error);
}

// === MQTT Client Initialization (if used) ===
let mqttClient;
try {
    const initializeMqttClient = require("./src/mqttClientSetup");
    mqttClient = initializeMqttClient();
    console.log('🔌 MQTT-Client erfolgreich initialisiert.');
} catch (error) {
    console.error('❌ Fehler bei der Initialisierung des MQTT-Clients:', error);
}

// === HTTPS Server Setup ===
let sslOptions;
try {
    if (process.env.USE_HTTPS === 'true') {
        if (process.env.NODE_ENV === 'production') {
            sslOptions = {
                key: fs.readFileSync(process.env.SSL_KEY_PATH),
                cert: fs.readFileSync(process.env.SSL_CERT_PATH),
                ca: process.env.SSL_CA_PATH ? fs.readFileSync(process.env.SSL_CA_PATH) : undefined
            };
        } else {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            sslOptions = {
                key: fs.readFileSync(process.env.SSL_KEY_PATH),
                cert: fs.readFileSync(process.env.SSL_CERT_PATH)
            };
        }
        console.log('🔑 SSL-Zertifikate erfolgreich geladen.');
    } else {
        console.warn('⚠️ HTTPS ist deaktiviert. Der Server läuft ohne SSL.');
    }
} catch (error) {
    console.error(`❌ Fehler beim Laden der SSL-Zertifikate: ${error.message}`);
    process.exit(1);
}

const httpsPort = process.env.HTTPS_PORT || 8443;

const httpsServer = https.createServer(sslOptions, app);

httpsServer.listen(httpsPort, () => {
    console.log(`✅ HTTPS-Server läuft auf Port ${httpsPort}`);
}).on('error', (err) => {
    console.error(`🔴 HTTPS-Server konnte nicht gestartet werden: ${err.message}`);
    process.exit(1);
});

// === WebSocket Server Setup ===
try {
    const { setWebSocketServer, sendWebSocketMessage } = require("./websocket/webSocketUtils");
    const handleWebSocketConnections = require("./websocket/webSocketHandler");
    const wss = new WebSocketServer({ server: httpsServer });
    setWebSocketServer(wss);
    handleWebSocketConnections(wss);
    console.log('🔗 WebSocket-Server läuft und wartet auf Verbindungen.');
} catch (error) {
    console.error(`❌ Fehler beim Einrichten des WebSocket-Servers: ${error.message}`);
    process.exit(1);
}

// === Swagger Setup ===
try {
    const swaggerOptions = {
        swaggerDefinition: {
            openapi: "3.0.0",
            info: {
                title: "OEE Metrics API",
                version: "1.0.0",
                description: "API zur Verwaltung von OEE-Metriken und verwandten Ressourcen.",
                contact: {
                    name: "Support-Team",
                    email: "oeesolution@gamil.com"
                }
            },
            servers: [
                {
                    url: process.env.NODE_ENV === 'production' ? `https://iotshowroom.de/api/v1` : `https://localhost:${httpsPort}/api/v1`,
                    description: process.env.NODE_ENV === 'production' ? "Produktionsserver" : "Entwicklungsserver"
                }
            ],
            components: {
                securitySchemes: {
                    ApiKeyAuth: {
                        type: "apiKey",
                        in: "header",
                        name: "x-api-key",
                        description: "Geben Sie Ihren API-Schlüssel ein, um auf die API zuzugreifen."
                    }
                }
            },
            security: [
                {
                    ApiKeyAuth: []
                }
            ]
        },
        apis: ["./routes/*.js"],
    };

    const swaggerDocs = swaggerJsDoc(swaggerOptions);
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
    app.get("/api-docs-json", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.send(swaggerDocs);
    });
    console.log("📄 Swagger-Dokumentation verfügbar unter /api-docs und /api-docs-json.");
} catch (error) {
    console.error(`❌ Fehler beim Einrichten von Swagger: ${error.message}`);
    process.exit(1);
}

// === Graceful Shutdown Handling ===
try {
    const gracefulShutdown = require("./src/shutdown");

    process.on("SIGTERM", () => gracefulShutdown(httpsServer, mqttClient, "SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown(httpsServer, mqttClient, "SIGINT"));
    console.log('🛑 Graceful Shutdown Handlers eingerichtet.');
} catch (error) {
    console.error(`❌ Fehler beim Einrichten der Graceful Shutdown Handlers: ${error.message}`);
    process.exit(1);
}

// === Handle Unhandled Rejections and Exceptions ===
try {
    const { defaultLogger } = require("./utils/logger");

    process.on('unhandledRejection', (reason, promise) => {
        defaultLogger.error('🔴 Unhandled Rejection bei:', promise, 'Grund:', reason);
    });

    process.on('uncaughtException', (error) => {
        defaultLogger.error('🔴 Uncaught Exception geworfen:', error);
    });

    console.log('🚨 Unhandled Rejections und Uncaught Exceptions Handler eingerichtet.');
} catch (error) {
    console.error(`❌ Fehler beim Einrichten der Prozess-Handler: ${error.message}`);
    process.exit(1);
}

require('dotenv').config();

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const https = require('https');
const fs = require('fs');
const http = require('http');
const { Server } = require("ws"); // Correctly importing WebSocket Server
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { defaultLogger } = require("./utils/logger");
const { logRetentionDays } = require("./config/config");
const startLogCleanupJob = require("./cronJobs/logCleanupJob");
const initializeMqttClient = require("./src/mqttClientSetup");
const handleWebSocketConnections = require("./websocket/webSocketHandler");
const gracefulShutdown = require("./src/shutdown");
const { initializeInfluxDB } = require("./services/influxDBService");
const registerApiRoutes = require("./routes/apiRoutes");
const { setWebSocketServer } = require("./websocket/webSocketUtils");
const app = express();
const cors = require('cors');
const httpsPort = process.env.HTTPS_PORT || 443;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // WARNING: Only for development purposes!

// Load CORS_ALLOWED_ORIGINS aus der .env Datei
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS || '*';

// Security Middleware Setup
app.use(helmet());
app.use(
    helmet.contentSecurityPolicy({
        useDefaults: true,
        directives: {
            "img-src": ["'self'", "https:", "data:", "https://lh3.googleusercontent.com"],
            "default-src": ["'self'"],
            "script-src": ["'self'"],
            "style-src": ["'self'"] // Removed 'unsafe-inline' for security reasons
        }
    })
);
app.use(helmet.referrerPolicy({ policy: 'no-referrer' }));

// Enable CORS with origins from .env
app.use(cors({
    origin: allowedOrigins === '*' ? true : allowedOrigins.split(',')
}));

// Middleware Setup for parsing JSON and URL-encoded data
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

// Initialize InfluxDB
initializeInfluxDB();

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    defaultLogger.error(err.stack);
    res.status(500).send("Something broke!");
});

// Rate Limiting Middleware to prevent DoS attacks
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: 100
});
app.use(limiter);

// Register API Routes (routes are protected inside registerApiRoutes file)
registerApiRoutes(app);

defaultLogger.info("Logger initialized successfully.");

// Cron Job for Log Cleanup
startLogCleanupJob(logRetentionDays);

// MQTT Client Initialization
const mqttClient = initializeMqttClient();

// HTTPS Server Initialization
const sslOptions = process.env.NODE_ENV === 'production' ? {
    key: fs.readFileSync(process.env.SSL_KEY_PATH || path.join(__dirname, './certs/iotshowroom.key')),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH || path.join(__dirname, './certs/fullchain.cert'))
} : {
    key: fs.readFileSync(path.join(__dirname, './certs/localhost.key')),
    cert: fs.readFileSync(path.join(__dirname, './certs/localhost.cert'))
};

const httpsServer = https.createServer(sslOptions, app).listen(httpsPort, () => {
    defaultLogger.info(`HTTPS Server is running on port ${httpsPort}`);
}).on('error', (err) => {
    defaultLogger.error(`Failed to start HTTPS server: ${err.message}`);
});

// WebSocket Server Setup
const wss = new Server({ server: httpsServer });
setWebSocketServer(wss); // WebSocket-Instanz im Singleton setzen
handleWebSocketConnections(wss);

// Graceful Shutdown Handling
process.on("SIGTERM", () => gracefulShutdown(httpsServer, mqttClient, "SIGTERM"));
process.on("SIGINT", () => gracefulShutdown(httpsServer, mqttClient, "SIGINT"));

// Swagger Setup
const swaggerOptions = {
    swaggerDefinition: {
        openapi: "3.0.0",
        info: {
            title: "OEE Metrics API",
            version: "1.0.0",
            description: "API for managing OEE metrics and related resources.",
            contact: {
                name: "Support Team",
                email: "support@example.com"
            }
        },
        servers: [{
            url: `https://localhost:${httpsPort}/api/v1`,
            description: "Local server"
        }]
    },
    apis: ["./routes/*.js"], // Adjust this path to where your route files are located
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
// Load Environment Variables
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Dynamically load .env file based on NODE_ENV
const env = process.env.NODE_ENV || 'development';
const envFilePath = path.resolve(__dirname, `.env.${env}`);

if (fs.existsSync(envFilePath)) {
    dotenv.config({ path: envFilePath });
    console.log(`Loaded environment variables from ${envFilePath}`);
} else {
    console.warn(`Environment file ${envFilePath} not found. Default variables will be used.`);
}

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const https = require('https');
const { Server } = require("ws");
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

// === CORS Configuration ===
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS || '*';
app.use(cors({
    origin: allowedOrigins === '*' ? true : allowedOrigins.split(',')
}));

// === API Key Middleware for External Requests Only ===
// === Enhanced API Key Middleware with Logging for Debugging ===
app.use((req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const clientIp = req.ip || req.connection.remoteAddress;
    const requestHostname = req.hostname;

    // Define if request is considered internal
    const isInternalRequest = ['::1', '127.0.0.1', 'localhost', process.env.INTERNAL_SERVER_IP].includes(clientIp) ||
        requestHostname === 'localhost' ||
        requestHostname === process.env.INTERNAL_SERVER_HOSTNAME;

    // Logging to help with debugging
    console.log(`Request received from IP: ${clientIp}, Hostname: ${requestHostname}`);
    console.log(`Internal Request Check: ${isInternalRequest ? 'Internal' : 'External'}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);

    if (process.env.NODE_ENV === 'production') {
        if (!isInternalRequest) {
            console.log('External request detected. Checking API Key...');
            if (apiKey !== process.env.API_KEY) {
                console.error('Unauthorized: Invalid API Key provided.');
                return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
            }
            console.log('API Key validated successfully for external request.');
        } else {
            console.log('Internal request - no API Key required.');
        }
    }

    next();
});


// === Security Middleware ===
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

// === Middleware for Parsing JSON and Form Data ===
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

// === Initialize InfluxDB (if used) ===
initializeInfluxDB();

// === Global Error Handling Middleware ===
app.use((err, req, res, next) => {
    defaultLogger.error(err.stack);
    res.status(500).send("Something went wrong!");
});

// === Rate Limiting to Prevent DoS Attacks ===
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: 100
});
app.use(limiter);

// === Register API Routes ===
registerApiRoutes(app);
defaultLogger.info("Logger initialized successfully.");

// === Log Cleanup Job ===
startLogCleanupJob(logRetentionDays);

// === MQTT Client Initialization (if used) ===
const mqttClient = initializeMqttClient();

// === HTTPS Server Setup ===
let sslOptions;
if (process.env.NODE_ENV === 'production') {
    // Production environment - Use valid certificate
    sslOptions = {
        key: fs.readFileSync(process.env.SSL_KEY_PATH),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH),
        ca: process.env.SSL_CA_PATH ? fs.readFileSync(process.env.SSL_CA_PATH) : undefined
    };
} else {
    // Development environment - Allow self-signed certificates
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    sslOptions = {
        key: fs.readFileSync(process.env.SSL_KEY_PATH),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH)
    };
}

const httpsServer = https.createServer(sslOptions, app).listen(httpsPort, () => {
    defaultLogger.info(`HTTPS Server is running on port ${httpsPort}`);
}).on('error', (err) => {
    defaultLogger.error(`Failed to start HTTPS server: ${err.message}`);
});

// === WebSocket Server Setup ===
const wss = new Server({ server: httpsServer });
setWebSocketServer(wss);
handleWebSocketConnections(wss);
defaultLogger.info("WebSocket server is running and waiting for connections.");

// === Graceful Shutdown Handling ===
process.on("SIGTERM", () => gracefulShutdown(httpsServer, mqttClient, "SIGTERM"));
process.on("SIGINT", () => gracefulShutdown(httpsServer, mqttClient, "SIGINT"));

// === Swagger Setup ===
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
            url: process.env.NODE_ENV === 'production' ?
                `https://iotshowroom.de/api/v1` : `https://localhost:${httpsPort}/api/v1`,
            description: process.env.NODE_ENV === 'production' ? "Production server" : "Development server"
        }],
        components: {
            securitySchemes: {
                ApiKeyAuth: {
                    type: "apiKey",
                    in: "header",
                    name: "x-api-key"
                }
            }
        },
        security: [{ ApiKeyAuth: [] }]
    },
    apis: ["./routes/*.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
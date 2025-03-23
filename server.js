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
    console.log(`✅ Environment variables loaded from ${envFilePath}.`);
} else {
    console.warn(`⚠️ Environment file ${envFilePath} not found. Using default variables.`);
    dotenv.config(); // Load default .env if it exists
}

// Validate required environment variables
const requiredEnvVars = ['API_KEY', 'SSL_KEY_PATH', 'SSL_CERT_PATH'];
if (process.env.NODE_ENV === 'production') {
    requiredEnvVars.forEach(envVar => {
        if (!process.env[envVar]) {
            console.error(`❌ Error: Required environment variable ${envVar} is not set.`);
            process.exit(1);
        }
    });
}

// === Import Logging Function ===
const logEnvVariables = require('./utils/logEnv'); // Ensure this file exists

// Log environment variables
if (process.env.NODE_ENV === 'development') {
    logEnvVariables();
}

// === Import Required Modules ===
let express, helmet, rateLimit, https, WebSocketServer, swaggerJsDoc, swaggerUi, cors;

try {
    console.log('🔄 Importing Express...');
    express = require("express");
    console.log('✅ Express successfully imported.');

    console.log('🔄 Importing Helmet...');
    helmet = require("helmet");
    console.log('✅ Helmet successfully imported.');

    console.log('🔄 Importing express-rate-limit...');
    rateLimit = require("express-rate-limit");
    console.log('✅ express-rate-limit successfully imported.');

    console.log('🔄 Importing HTTPS...');
    https = require('https');
    console.log('✅ HTTPS successfully imported.');

    console.log('🔄 Importing ws...');
    WebSocketServer = require("ws").Server;
    console.log('✅ ws successfully imported.');

    console.log('🔄 Importing swagger-jsdoc...');
    swaggerJsDoc = require('swagger-jsdoc');
    console.log('✅ swagger-jsdoc successfully imported.');

    console.log('🔄 Importing swagger-ui-express...');
    swaggerUi = require('swagger-ui-express');
    console.log('✅ swagger-ui-express successfully imported.');

    console.log('🔄 Importing CORS...');
    cors = require('cors');
    console.log('✅ CORS successfully imported.');

} catch (error) {
    console.error(`❌ Error importing modules: ${error.message}`);
    process.exit(1);
}

// === Initialize Express App ===
let app;
try {
    console.log('📝 Initializing Express app...');
    app = express();
    console.log('✅ Express app successfully initialized.');
} catch (error) {
    console.error(`❌ Error initializing Express app: ${error.message}`);
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
    console.log('🔒 Helmet security middleware initialized.');
} catch (error) {
    console.error(`❌ Error initializing security middleware: ${error.message}`);
    process.exit(1);
}

// === Rate Limiting Middleware ===
try {
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.'
    });
    app.use(limiter);
    console.log('⏱️ Rate-limiting middleware successfully set up.');
} catch (error) {
    console.error(`❌ Error setting up rate-limiting middleware: ${error.message}`);
    process.exit(1);
}

// === CORS Configuration ===
try {
    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS || '*';
    app.use(cors({
        origin: allowedOrigins === '*' ? true : allowedOrigins.split(',')
    }));
    console.log(`🔗 CORS configured with origins: ${allowedOrigins}`);
} catch (error) {
    console.error(`❌ Error configuring CORS: ${error.message}`);
    process.exit(1);
}

// === Middleware for Parsing JSON and Form Data ===
try {
    app.use(express.json({ limit: "10kb" }));
    app.use(express.urlencoded({ extended: true, limit: "10kb" }));
    app.use(express.static(path.join(__dirname, "public")));
    console.log('📦 Middleware for JSON and URL-encoded data successfully initialized.');
} catch (error) {
    console.error(`❌ Error initializing data parsing middleware: ${error.message}`);
    process.exit(1);
}

// === Initialize InfluxDB (if used) ===
try {
    const { initializeInfluxDB } = require("./services/influxDBService");
    initializeInfluxDB();
    console.log('📈 InfluxDB successfully initialized.');
} catch (error) {
    console.error(`❌ Error initializing InfluxDB: ${error.message}`);
}

// === Logging Middleware ===
try {
    const { defaultLogger } = require("./utils/logger");
    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            defaultLogger.info(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
        });
        next();
    });
    console.log('📝 Logging middleware successfully initialized.');
} catch (error) {
    console.error(`❌ Error setting up logging middleware: ${error.message}`);
    process.exit(1);
}

// === API Key Middleware for External Requests ===
try {
    const { defaultLogger } = require("./utils/logger");
    
    app.use((req, res, next) => {
        const apiKey = req.headers['x-api-key'];
        const clientIp = req.ip || req.socket.remoteAddress;
        const requestHostname = req.hostname;

        // Detect internal requests
        const isInternalRequest = ['::1', '127.0.0.1', 'localhost', process.env.INTERNAL_SERVER_IP].includes(clientIp) ||
            requestHostname === 'localhost' ||
            requestHostname === process.env.INTERNAL_SERVER_HOSTNAME;

        defaultLogger.info(`📍 Request from IP: ${clientIp}, Hostname: ${requestHostname}, Internal: ${isInternalRequest}`);

        // Exclude Swagger endpoints from authentication
        if (req.path.startsWith('/api-docs') || req.path === '/swagger.json') {
            defaultLogger.info('🔓 Access to Swagger endpoint allowed.');
            return next();
        }

        // API key validation for production environment
        if (process.env.NODE_ENV === 'production' && !isInternalRequest && apiKey !== process.env.API_KEY) {
            defaultLogger.error('❌ Unauthorized: Invalid API key provided.');
            return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
        }

        next();
    });

    console.log('🔒 API key middleware successfully set up.');
} catch (error) {
    console.error(`❌ Error setting up API key middleware: ${error.message}`);
    process.exit(1);
}

// === Register API Routes ===
try {
    const registerApiRoutes = require("./routes/apiRoutes");
    registerApiRoutes(app);
    console.log('📁 API routes successfully registered.');
} catch (error) {
    console.error(`❌ Error registering API routes: ${error.message}`);
    process.exit(1);
}

// === Global Error Handling Middleware ===
try {
    const { defaultLogger } = require("./utils/logger");
    app.use((err, req, res, next) => {
        defaultLogger.error(`[${new Date().toISOString()}] Error: ${err.message}`);
        defaultLogger.error(err.stack);
        res.status(500).send("Something went wrong!");
    });
    console.log('⚠️ Global error handling middleware successfully set up.');
} catch (error) {
    console.error(`❌ Error setting up global error handling: ${error.message}`);
    process.exit(1);
}

// === Log Cleanup Job ===
try {
    const startLogCleanupJob = require("./cronJobs/logCleanupJob");
    const logRetentionDays = parseInt(process.env.LOG_RETENTION_DAYS, 10) || 7;
    if (isNaN(logRetentionDays)) {
        console.error('❌ Invalid value for LOG_RETENTION_DAYS. Using default value of 7.');
    }
    startLogCleanupJob(logRetentionDays);
    console.log(`🧹 Log cleanup job started. Logs older than ${logRetentionDays} days will be deleted.`);
} catch (error) {
    console.error(`❌ Error starting log cleanup job: ${error.message}`);
    console.error(error.stack);
}

// === MQTT Client Initialization (if used) ===
let mqttClient;
try {
    const initializeMqttClient = require("./src/mqttClientSetup");
    mqttClient = initializeMqttClient();
    mqttClient.on('error', (error) => {
        console.error('❌ MQTT client error:', error);
    });
    console.log('🔌 MQTT client successfully initialized.');
} catch (error) {
    console.error(`❌ Error initializing MQTT client: ${error.message}`);
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
        console.log('🔑 SSL certificates successfully loaded.');
    } else {
        console.warn('⚠️ HTTPS is disabled. The server is running without SSL.');
    }
} catch (error) {
    console.error(`❌ Error loading SSL certificates: ${error.message}`);
    process.exit(1);
}

const httpsPort = parseInt(process.env.HTTPS_PORT, 10) || 8443;
if (isNaN(httpsPort) || httpsPort < 1 || httpsPort > 65535) {
    console.error('❌ Invalid HTTPS port. Please provide a valid port between 1 and 65535.');
    process.exit(1);
}

const httpsServer = https.createServer(sslOptions, app);

httpsServer.listen(httpsPort, () => {
    console.log(`✅ HTTPS server running on port ${httpsPort}`);
}).on('error', (err) => {
    console.error(`🔴 HTTPS server could not start: ${err.message}`);
    process.exit(1);
});

// === WebSocket Server Setup ===
try {
    const { setWebSocketServer } = require("./websocket/webSocketUtils");
    const handleWebSocketConnections = require("./websocket/webSocketHandler");
    const wss = new WebSocketServer({ server: httpsServer });
    setWebSocketServer(wss);
    handleWebSocketConnections(wss);
    wss.on('error', (error) => {
        console.error('❌ WebSocket server error:', error);
    });
    console.log('🔗 WebSocket server running and waiting for connections.');
} catch (error) {
    console.error(`❌ Error setting up WebSocket server: ${error.message}`);
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
                description: "API for managing OEE metrics and related resources.",
                contact: {
                    name: "Support Team",
                    email: "oeesolution@gmail.com"
                }
            },
            servers: [
                {
                    url: process.env.NODE_ENV === 'production' ? `https://iotshowroom.de/api/v1` : `https://localhost:${httpsPort}/api/v1`,
                    description: process.env.NODE_ENV === 'production' ? "Production server" : "Development server"
                }
            ],
            components: {
                securitySchemes: {
                    ApiKeyAuth: {
                        type: "apiKey",
                        in: "header",
                        name: "x-api-key",
                        description: "Enter your API key to access the API."
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
    console.log("📄 Swagger documentation available at /api-docs and /api-docs-json.");
} catch (error) {
    console.error(`❌ Error setting up Swagger: ${error.message}`);
    process.exit(1);
}

// === Graceful Shutdown Handling ===
try {
    const gracefulShutdown = require("./src/shutdown");

    process.on("SIGTERM", () => gracefulShutdown(httpsServer, mqttClient, "SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown(httpsServer, mqttClient, "SIGINT"));
    console.log('🛑 Graceful shutdown handlers set up.');
} catch (error) {
    console.error(`❌ Error setting up graceful shutdown handlers: ${error.message}`);
    process.exit(1);
}

// === Handle Unhandled Rejections and Exceptions ===
try {
    const { defaultLogger } = require("./utils/logger");

    process.on('unhandledRejection', (reason, promise) => {
        defaultLogger.error('🔴 Unhandled rejection at:', promise, 'Reason:', reason);
    });

    process.on('uncaughtException', (error) => {
        defaultLogger.error('🔴 Uncaught exception thrown:', error);
    });

    console.log('🚨 Unhandled rejections and uncaught exceptions handlers set up.');
} catch (error) {
    console.error(`❌ Error setting up process handlers: ${error.message}`);
    process.exit(1);
}
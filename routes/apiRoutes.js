require('dotenv').config(); // Lade die Umgebungsvariablen

const express = require("express");
const jwt = require('jsonwebtoken');

// Import all your routers as before
const machinesRouter = require("./machines");
const plannedDowntimeRouter = require("./plannedDowntime");
const processOrdersRouter = require("./processOrders");
const shiftModelRouter = require("./shiftModels");
const unplannedDowntimeRouter = require("./unplannedDowntime");
const oeeConfigRouter = require("./oeeConfig");
const microStopsRouter = require("./microstops");
const userRouter = require("./users");
const topicsRouter = require("./topics");
const ratingsRouter = require("./ratings");
const microstopMachineAggregationRouter = require("./microstopByMachine");
const microstopProcessOrderAggregationRouter = require("./microstopByProcessOrder");
const settingRouter = require("./settings");
const structureRouter = require("./structure");
const oeeLogsRouter = require("./oeeLogs");
const calculateOEERouter = require("./calculateOEE");
const oeeMetricsRouter = require("./oeeMetricsRoutes");
const prepareOEERouter = require("./prepareOEE");
const oeeDataRouter = require("./oeeRoutes");
const tactRouter = require('./tact');

// Middleware for token verification
const verifyToken = (req, res, next) => {
    // Hole die vertrauenswürdige IP-Adresse aus der Umgebungskonfiguration
    const trustedIp = process.env.TRUSTED_INTERNAL_IP;

    // Prüfe die IP-Adresse der eingehenden Anfrage
    if (req.ip === trustedIp || req.hostname === 'localhost') {
        return next(); // Überspringe die Authentifizierung für die vertrauenswürdige interne IP
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Malformed token' });
    }

    jwt.verify(token, process.env.AUTH0_CLIENT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Failed to authenticate token' });
        }

        req.user = decoded; // Benutzerinformationen zur Weiterverwendung speichern
        next();
    });
};

/**
 * Registers the API routes with the provided Express application.
 *
 * @param {express.Express} app - The Express application instance.
 */
function registerApiRoutes(app) {
    // OEE API Endpoints for OEE Data
    app.use("/api/v1/machines", verifyToken, machinesRouter);
    app.use("/api/v1/planneddowntime", verifyToken, plannedDowntimeRouter);
    app.use("/api/v1/processorders", verifyToken, processOrdersRouter);
    app.use("/api/v1/shiftmodels", verifyToken, shiftModelRouter);
    app.use("/api/v1/unplanneddowntime", verifyToken, unplannedDowntimeRouter);
    app.use("/api/v1/oeeconfig", verifyToken, oeeConfigRouter);
    app.use("/api/v1/microstops", verifyToken, microStopsRouter);

    // Register microstop aggregation routes
    app.use("/api/v1/microstop-aggregation/machine", verifyToken, microstopMachineAggregationRouter);
    app.use("/api/v1/microstop-aggregation/process-order", verifyToken, microstopProcessOrderAggregationRouter);

    // Additional API Endpoints for Customizing the OEE System
    app.use("/api/v1/structure", verifyToken, structureRouter);
    app.use("/api/v1/oee-logs", verifyToken, oeeLogsRouter);
    app.use("/api/v1/calculateOEE", verifyToken, calculateOEERouter);
    app.use("/api/v1/topics", verifyToken, topicsRouter);
    app.use("/api/v1/users", verifyToken, userRouter);
    app.use("/api/v1/ratings", verifyToken, ratingsRouter);
    app.use("/api/v1", verifyToken, oeeMetricsRouter);
    app.use("/api/v1/settings", verifyToken, settingRouter);
    app.use("/api/v1/prepareOEE", verifyToken, prepareOEERouter);
    app.use("/api/v1", verifyToken, oeeDataRouter);
    app.use('/api/v1/tact', verifyToken, tactRouter);
}

module.exports = registerApiRoutes;
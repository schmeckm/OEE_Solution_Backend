require('dotenv').config(); // Load environment variables

const express = require("express");
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

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

// Zentralisiertes Fehlerhandling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Middleware for API key verification
const verifyApiKey = asyncHandler(async (req, res, next) => {
  try {
    // Get the trusted internal IP address from the environment configuration
    const trustedIp = process.env.TRUSTED_INTERNAL_IP;

    // Check the IP address of the incoming request
    if (req.ip === trustedIp || req.hostname === 'localhost') {
      return next(); // Skip authentication for the trusted internal IP
    }

    const apiKey = req.headers['x-api-key'];

    // Eingabevalidierung
    const schema = Joi.string().required();
    const { error, value } = schema.validate(apiKey);

    if (error) {
      return res.status(401).json({ message: 'Kein API-Schlüssel bereitgestellt' });
    }

    // Eingabesäuberung
    const sanitizedApiKey = sanitizeHtml(value);

    if (sanitizedApiKey !== process.env.API_KEY) {
      return res.status(403).json({ message: 'Ungültiger API-Schlüssel' });
    }

    next(); // API-Schlüssel ist gültig, weiter zur nächsten Middleware oder Route
  } catch (error) {
    console.error('Fehler bei der API-Schlüssel-Überprüfung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
});

/**
 * Registriert die API-Routen mit der bereitgestellten Express-Anwendung.
 *
 * @param {express.Express} app - Die Express-Anwendungsinstanz.
 */
function registerApiRoutes(app) {
  // OEE API Endpoints for OEE Data
  app.use("/api/v1/workcenters", verifyApiKey, machinesRouter);
  app.use("/api/v1/planneddowntime", verifyApiKey, plannedDowntimeRouter);
  app.use("/api/v1/processorders", verifyApiKey, processOrdersRouter);
  app.use("/api/v1/shiftmodels", verifyApiKey, shiftModelRouter);
  app.use("/api/v1/unplanneddowntime", verifyApiKey, unplannedDowntimeRouter);
  app.use("/api/v1/oeeconfig", verifyApiKey, oeeConfigRouter);
  app.use("/api/v1/microstops", verifyApiKey, microStopsRouter);

  // Register microstop aggregation routes
  app.use("/api/v1/microstop-aggregation/machine", verifyApiKey, microstopMachineAggregationRouter);
  app.use("/api/v1/microstop-aggregation/process-order", verifyApiKey, microstopProcessOrderAggregationRouter);

  // Additional API Endpoints for Customizing the OEE System
  app.use("/api/v1/structure", verifyApiKey, structureRouter);
  app.use("/api/v1/oee-logs", verifyApiKey, oeeLogsRouter);
  app.use("/api/v1/calculateOEE", verifyApiKey, calculateOEERouter);
  app.use("/api/v1/topics", verifyApiKey, topicsRouter);
  app.use("/api/v1/users", verifyApiKey, userRouter);
  app.use("/api/v1/ratings", verifyApiKey, ratingsRouter);
  app.use("/api/v1/oee-metrics", verifyApiKey, oeeMetricsRouter);
  app.use("/api/v1/settings", verifyApiKey, settingRouter);
  app.use("/api/v1/prepareOEE", verifyApiKey, prepareOEERouter);
  app.use("/api/v1/oee", verifyApiKey, oeeDataRouter);
  app.use('/api/v1/tact', verifyApiKey, tactRouter);
}

module.exports = registerApiRoutes;

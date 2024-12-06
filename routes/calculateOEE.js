const express = require('express');
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');
const { calculateOEE } = require('../src/oeeCalculator');
const { oeeLogger, errorLogger } = require('../utils/logger');

const router = express.Router();

// Zentralisiertes Fehlerhandling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Eingabevalidierung und -säuberung
const validateAndSanitizeOEEData = (req, res, next) => {
  const schema = Joi.object({
    plannedProductionTime: Joi.number().required(),
    operatingTime: Joi.number().required(),
    goodUnits: Joi.number().required(),
    totalUnits: Joi.number().required(),
    idealCycleTime: Joi.number().required(),
    // Weitere erforderliche Felder hinzufügen
  });

  const { error, value } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({ message: `Ungültige Eingabedaten: ${error.details[0].message}` });
  }

  // Eingaben säubern (falls notwendig)
  // Wenn es String-Felder gibt, diese mit sanitizeHtml säubern
  // Beispiel:
  // value.someStringField = sanitizeHtml(value.someStringField);

  // Gesäuberte und validierte Daten in req.body speichern
  req.body = value;

  next();
};

/**
 * @swagger
 * tags:
 *   name: OEE Calculation
 *   description: API zur Berechnung der Overall Equipment Effectiveness (OEE)
 */

/**
 * @swagger
 * /calculateOEE:
 *   post:
 *     summary: Berechnet die Overall Equipment Effectiveness (OEE)
 *     description: Berechnet die OEE basierend auf den bereitgestellten Daten.
 *     tags:
 *       - OEE Calculation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plannedProductionTime
 *               - operatingTime
 *               - goodUnits
 *               - totalUnits
 *               - idealCycleTime
 *             properties:
 *               plannedProductionTime:
 *                 type: number
 *                 description: Geplante Produktionszeit.
 *               operatingTime:
 *                 type: number
 *                 description: Tatsächliche Betriebszeit.
 *               goodUnits:
 *                 type: number
 *                 description: Anzahl der produzierten Gutteile.
 *               totalUnits:
 *                 type: number
 *                 description: Gesamtanzahl der produzierten Teile.
 *               idealCycleTime:
 *                 type: number
 *                 description: Ideale Zykluszeit pro Teil.
 *     responses:
 *       200:
 *         description: OEE erfolgreich berechnet.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 availability:
 *                   type: number
 *                   description: Verfügbarkeit in Prozent.
 *                 performance:
 *                   type: number
 *                   description: Leistung in Prozent.
 *                 quality:
 *                   type: number
 *                   description: Qualität in Prozent.
 *                 oee:
 *                   type: number
 *                   description: Gesamt-OEE in Prozent.
 *       400:
 *         description: Ungültige Eingabedaten.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Interner Serverfehler.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.post(
  '/',
  validateAndSanitizeOEEData,
  asyncHandler(async (req, res) => {
    try {
      const data = req.body; // Extrahiere Daten aus dem Request-Body

      const result = await calculateOEE(data); // Berechne OEE mit den bereitgestellten Daten

      res.status(200).json(result); // Sende das Ergebnis als JSON-Antwort
    } catch (error) {
      oeeLogger.error('Fehler bei der OEE-Berechnung:', error); // Logge den Fehler zur Fehlerbehebung
      res.status(500).json({ message: 'Interner Serverfehler' }); // Sende eine Fehlerantwort
    }
  })
);

module.exports = router;

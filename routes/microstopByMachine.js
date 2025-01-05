const express = require("express");
const router = express.Router();
const Joi = require("joi");
const sanitizeHtml = require("sanitize-html");
const moment = require("moment-timezone");

const { aggregateMicrostopsByMachine } = require("../services/microstopAggregationByMachine");
const { defaultLogger, errorLogger } = require("../utils/logger");

/**
 * @swagger
 * tags:
 *   name: Microstop Aggregation
 *   description: API zur Aggregation von Microstop-Daten
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AggregateMicrostopResult:
 *       type: object
 *       properties:
 *         machine_id:
 *           type: string
 *           description: Die ID der Maschine, deren Daten aggregiert werden.
 *         microstops:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Grund für den Microstop.
 *               total:
 *                 type: integer
 *                 description: Gesamtdauer des Microstops.
 */

/**
 * @swagger
 * /microstop-aggregation/machine:
 *   get:
 *     summary: Aggregierte Microstop-Daten abrufen, optional gefiltert nach Maschinen-ID und Datumsbereich
 *     tags: [Microstop Aggregation]
 *     parameters:
 *       - in: query
 *         name: machine_id
 *         required: false
 *         schema:
 *           type: string
 *         description: Die eindeutige Kennung der Maschine, nach der die Microstops gefiltert werden sollen.
 *       - in: query
 *         name: start
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Startdatum für die Filterung der Microstops, im ISO 8601 Format.
 *       - in: query
 *         name: end
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Enddatum für die Filterung der Microstops, im ISO 8601 Format.
 *     responses:
 *       200:
 *         description: Erfolgreich aggregierte Microstop-Daten abgerufen.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AggregateMicrostopResult'
 *       400:
 *         description: Ungültige Abfrageparameter.
 *       404:
 *         description: Keine Daten für die gegebenen Filter gefunden.
 *       500:
 *         description: Interner Serverfehler.
 */

// Zentralisiertes Fehlerhandling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Eingabevalidierung und -säuberung
const validateAndSanitizeQuery = (query) => {
  const schema = Joi.object({
    machine_id: Joi.string().optional(),
    start: Joi.date().iso().optional(),
    end: Joi.date().iso().optional(),
  });

  const { error, value } = schema.validate(query);

  if (error) {
    throw new Error(`Ungültige Abfrageparameter: ${error.details[0].message}`);
  }

  if (value.machine_id) {
    value.machine_id = sanitizeHtml(value.machine_id);
  }

  return value;
};

router.get(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const { machine_id, start, end } = validateAndSanitizeQuery(req.query);

      const startDate = start ? moment.tz(start, moment.tz.guess()).toISOString() : null;
      const endDate = end ? moment.tz(end, moment.tz.guess()).toISOString() : null;

      const result = await aggregateMicrostopsByMachine(
        machine_id,
        startDate,
        endDate
      );

      if (!result || (result.microstops && result.microstops.length === 0)) {
        return res
          .status(404)
          .json({ message: "Keine Daten für die gegebenen Filter gefunden." });
      }

      res.json(result);
    } catch (error) {
      if (error.message.startsWith("Ungültige Abfrageparameter")) {
        res.status(400).json({ message: error.message });
      } else {
        errorLogger.error("[ERROR] Interner Serverfehler:", error);
        res.status(500).json({ message: "Interner Serverfehler" });
      }
    }
  })
);

module.exports = router;

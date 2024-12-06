const express = require("express");
const router = express.Router();
const Joi = require("joi");
const sanitizeHtml = require("sanitize-html");
const moment = require("moment-timezone"); // Stellen Sie sicher, dass moment-timezone installiert ist

const {
  aggregateMicrostopsByMachine,
} = require("../services/microstopAggregationByMachine");
const { defaultLogger, errorLogger } = require("../utils/logger");

/**
 * @swagger
 * tags:
 *   name: Microstop Aggregation
 *   description: API zur Aggregation von Microstop-Daten
 */

/**
 * @swagger
 * /microstop-aggregation/machine:
 *   get:
 *     summary: Aggregierte Microstop-Daten abrufen, optional gefiltert nach Maschinen-ID und Datumsbereich
 *     tags: [Microstop Aggregation]
 *     description: Ruft eine Aggregation von Microstop-Daten ab, optional gefiltert nach einer bestimmten Maschinen-ID und einem Datumsbereich.
 *     parameters:
 *       - in: query
 *         name: machine_id
 *         required: false
 *         description: Die eindeutige Kennung der Maschine, nach der die Microstops gefiltert werden sollen.
 *         schema:
 *           type: string
 *       - in: query
 *         name: start
 *         required: false
 *         description: Startdatum für die Filterung der Microstops, im ISO 8601 Format.
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: end
 *         required: false
 *         description: Enddatum für die Filterung der Microstops, im ISO 8601 Format.
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Erfolgreich aggregierte Microstop-Daten abgerufen.
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

  // Eingaben säubern
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

      if (!result || Object.keys(result).length === 0) {
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

const express = require('express');
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');
const { writeOEEToInfluxDB, readOEEFromInfluxDB } = require('../services/oeeMetricsService');
const router = express.Router();

// Zentralisiertes Fehlerhandling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Eingabevalidierung und -säuberung für POST
const validateAndSanitizeOeeMetrics = (data) => {
  const schema = Joi.object({
    processData: Joi.object({
      plant: Joi.string().required(),
      area: Joi.string().required(),
      machineId: Joi.string().required(),
      ProcessOrderNumber: Joi.string().required(),
      MaterialNumber: Joi.string().required(),
      MaterialDescription: Joi.string().required(),
      plannedProductionQuantity: Joi.number().required(),
      plannedDowntime: Joi.number().required(),
      unplannedDowntime: Joi.number().required(),
      microstops: Joi.number().required(),
    }).required(),
    oee: Joi.number().min(0).max(100).required(),
    availability: Joi.number().min(0).max(100).required(),
    performance: Joi.number().min(0).max(100).required(),
    quality: Joi.number().min(0).max(100).required(),
  });

  const { error, value } = schema.validate(data);

  if (error) {
    throw new Error(`Ungültige Eingabedaten: ${error.details[0].message}`);
  }

  // Eingabesäuberung
  value.processData.plant = sanitizeHtml(value.processData.plant);
  value.processData.area = sanitizeHtml(value.processData.area);
  value.processData.machineId = sanitizeHtml(value.processData.machineId);
  value.processData.ProcessOrderNumber = sanitizeHtml(value.processData.ProcessOrderNumber);
  value.processData.MaterialNumber = sanitizeHtml(value.processData.MaterialNumber);
  value.processData.MaterialDescription = sanitizeHtml(value.processData.MaterialDescription);
  // Numerische Werte müssen nicht gesäubert werden

  return value;
};

// Eingabevalidierung und -säuberung für GET
const validateAndSanitizeQuery = (query) => {
  const schema = Joi.object({
    plant: Joi.string().optional(),
    area: Joi.string().optional(),
    machineId: Joi.string().optional(),
    processOrder: Joi.string().optional(),
  });

  const { error, value } = schema.validate(query);

  if (error) {
    throw new Error(`Ungültige Abfrageparameter: ${error.details[0].message}`);
  }

  // Eingabesäuberung
  if (value.plant) value.plant = sanitizeHtml(value.plant);
  if (value.area) value.area = sanitizeHtml(value.area);
  if (value.machineId) value.machineId = sanitizeHtml(value.machineId);
  if (value.processOrder) value.processOrder = sanitizeHtml(value.processOrder);

  return value;
};

/**
 * @swagger
 * /write-oee-metrics:
 *   post:
 *     summary: OEE-Metriken (Overall Equipment Effectiveness) in InfluxDB schreiben.
 *     description: Dieser Endpunkt akzeptiert OEE-Metrikdaten und schreibt sie mithilfe des OEE Metrics Service in InfluxDB.
 *     tags:
 *       - OEE Metrics
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OeeMetricsInput'
 *     responses:
 *       200:
 *         description: OEE-Metriken erfolgreich in InfluxDB geschrieben.
 *       400:
 *         description: Ungültige Eingabedaten.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Fehler beim Schreiben der Metriken aufgrund eines internen Serverfehlers.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/write-oee-metrics',
  asyncHandler(async (req, res) => {
    try {
      const sanitizedData = validateAndSanitizeOeeMetrics(req.body);
      await writeOEEToInfluxDB(sanitizedData);
      res.status(200).json({ message: 'Metriken erfolgreich geschrieben' });
    } catch (error) {
      if (error.message.startsWith('Ungültige Eingabedaten')) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Fehler beim Schreiben der Metriken', error: error.message });
      }
    }
  })
);

/**
 * @swagger
 * /read-oee-metrics:
 *   get:
 *     summary: OEE-Metriken (Overall Equipment Effectiveness) aus InfluxDB lesen.
 *     description: Dieser Endpunkt ruft OEE-Metrikdaten aus InfluxDB basierend auf optionalen Filtern wie Plant, Area, Maschinen-ID und Prozessauftrag ab.
 *     tags:
 *       - OEE Metrics
 *     parameters:
 *       - in: query
 *         name: plant
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter nach Plant.
 *       - in: query
 *         name: area
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter nach Area.
 *       - in: query
 *         name: machineId
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter nach Maschinen-ID.
 *       - in: query
 *         name: processOrder
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter nach Prozessauftragsnummer.
 *     responses:
 *       200:
 *         description: OEE-Metriken erfolgreich aus InfluxDB abgerufen.
 *       400:
 *         description: Ungültige Abfrageparameter.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Keine Metriken gefunden.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Fehler beim Abrufen der Metriken aufgrund eines internen Serverfehlers.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/read-oee-metrics',
  asyncHandler(async (req, res) => {
    try {
      const filters = validateAndSanitizeQuery(req.query);

      const data = await readOEEFromInfluxDB(filters);

      if (data.length > 0) {
        res.status(200).json(data);
      } else {
        res.status(404).json({ message: 'Keine Metriken gefunden' });
      }
    } catch (error) {
      if (error.message.startsWith('Ungültige Abfrageparameter')) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Fehler beim Abrufen der Metriken', error: error.message });
      }
    }
  })
);

module.exports = router;

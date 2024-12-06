const express = require('express');
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');
const { getOEEMetrics } = require('../src/oeeProcessor'); // Funktion zum Lesen der Buffer-Daten
const router = express.Router();

// Zentralisiertes Fehlerhandling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Eingabevalidierung und -säuberung
const validateAndSanitizeMachineId = (machineId) => {
  // Joi-Schema zur Validierung der machineId
  const schema = Joi.string().required();

  const { error, value } = schema.validate(machineId);

  if (error) {
    throw new Error(`Ungültige Maschinen-ID: ${error.details[0].message}`);
  }

  // Eingabesäuberung
  return sanitizeHtml(value);
};

/**
 * @swagger
 * tags:
 *   name: Realtime OEE by Line
 *   description: API zum Lesen der OEE-Daten einer Linie
 */

/**
 * @swagger
 * /oee/{machineId}:
 *   get:
 *     tags:
 *       - Realtime OEE by Line
 *     summary: Aktuelle OEE-Metriken für eine Maschine abrufen
 *     description: Ruft die aktuellen OEE-Metriken aus dem Puffer für die angegebene Maschine ab.
 *     parameters:
 *       - in: path
 *         name: machineId
 *         required: true
 *         schema:
 *           type: string
 *         description: Die ID der Maschine.
 *     responses:
 *       200:
 *         description: Ein JSON-Objekt mit den OEE-Metriken.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 oee:
 *                   type: number
 *                   description: Der berechnete OEE-Wert
 *       400:
 *         description: Ungültige Maschinen-ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: OEE-Daten der Maschine nicht gefunden.
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

router.get(
  '/:machineId',
  asyncHandler(async (req, res) => {
    try {
      const machineId = validateAndSanitizeMachineId(req.params.machineId);

      const metrics = await getOEEMetrics(machineId); // Rufe die OEE-Daten ab

      if (metrics) {
        res.json(metrics); // Rückgabe der OEE-Daten
      } else {
        res.status(404).json({ message: 'OEE-Daten der Maschine nicht gefunden.' });
      }
    } catch (error) {
      if (error.message.startsWith('Ungültige Maschinen-ID')) {
        res.status(400).json({ message: error.message });
      } else {
        console.error(`Fehler beim Abrufen der OEE-Daten für Maschine ${req.params.machineId}:`, error);
        res.status(500).json({ message: 'Interner Serverfehler' });
      }
    }
  })
);

module.exports = router;

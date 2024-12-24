const express = require('express');
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

const { generateTopics } = require('../services/topicService');

const router = express.Router();

// Zentralisiertes Fehlerhandling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Eingabevalidierung und -säuberung
/**
 * Validates and sanitizes the query parameters.
 *
 * @param {Object} query - The query parameters to validate and sanitize.
 * @param {string} [query.plant] - The plant parameter (optional).
 * @param {string} [query.area] - The area parameter (optional).
 * @param {string} [query.line] - The line parameter (optional).
 * @returns {Object} The validated and sanitized query parameters.
 * @throws {Error} If the query parameters are invalid.
 */
const validateAndSanitizeQuery = (query) => {
  const schema = Joi.object({
    plant: Joi.string().optional(),
    area: Joi.string().optional(),
    line: Joi.string().optional(),
  });

  const { error, value } = schema.validate(query);

  if (error) {
    throw new Error(`Ungültige Abfrageparameter: ${error.details[0].message}`);
  }

  // Eingaben säubern
  if (value.plant) value.plant = sanitizeHtml(value.plant);
  if (value.area) value.area = sanitizeHtml(value.area);
  if (value.line) value.line = sanitizeHtml(value.line);

  return value;
};

/**
 * @swagger
 * tags:
 *   name: Topics
 *   description: API zur Generierung dynamischer Topics basierend auf Maschinen- und OEE-Konfiguration
 */

/**
 * @swagger
 * /topics:
 *   get:
 *     summary: Dynamische Topics abrufen
 *     tags: [Topics]
 *     description: Generiert Topics basierend auf Plant, Area oder Line.
 *     parameters:
 *       - in: query
 *         name: plant
 *         schema:
 *           type: string
 *         description: Filter nach Plant
 *       - in: query
 *         name: area
 *         schema:
 *           type: string
 *         description: Filter nach Area
 *       - in: query
 *         name: line
 *         schema:
 *           type: string
 *         description: Filter nach Line
 *     responses:
 *       200:
 *         description: Eine Liste generierter Topics.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *       400:
 *         description: Ungültige Abfrageparameter.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Interner Serverfehler.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    try {
      // Eingabevalidierung und -säuberung
      const { plant, area, line } = validateAndSanitizeQuery(req.query);

      // Generieren der Topics
      const topics = await generateTopics(plant, area, line);

      res.json(topics);
    } catch (error) {
      if (error.message.startsWith('Ungültige Abfrageparameter')) {
        res.status(400).json({ message: error.message });
      } else {
        console.error('[ERROR]', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
      }
    }
  })
);

module.exports = router;

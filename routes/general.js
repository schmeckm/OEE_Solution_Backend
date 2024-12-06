const express = require('express');
const path = require('path');
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');
const { ratings } = require('../config/config'); // Import ratings from config

const router = express.Router();

// Zentralisiertes Fehlerhandling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @swagger
 * tags:
 *   name: Root
 *   description: Basisrouten der Anwendung
 */

/**
 * @swagger
 * /:
 *   get:
 *     summary: Liefert die Hauptseite der Anwendung
 *     tags: [Root]
 *     description: Sendet die index.html Datei als Antwort.
 *     responses:
 *       200:
 *         description: Die Hauptseite wurde erfolgreich geladen.
 *       500:
 *         description: Fehler beim Laden der Hauptseite.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    try {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    } catch (error) {
      console.error('Fehler beim Laden der Hauptseite:', error);
      res.status(500).json({ message: 'Fehler beim Laden der Hauptseite' });
    }
  })
);

/**
 * @swagger
 * /timezone:
 *   get:
 *     summary: Aktuelle Zeitzone abrufen
 *     tags: [Root]
 *     description: Gibt die aktuelle Zeitzone aus der Umgebungsvariable zurück.
 *     responses:
 *       200:
 *         description: Die aktuelle Zeitzone.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timezone:
 *                   type: string
 *       500:
 *         description: Fehler beim Abrufen der Zeitzone.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/timezone',
  asyncHandler(async (req, res) => {
    try {
      const timezone = process.env.TIMEZONE || 'UTC';
      const sanitizedTimezone = sanitizeHtml(timezone);
      res.status(200).json({ timezone: sanitizedTimezone });
    } catch (error) {
      console.error('Fehler beim Abrufen der Zeitzone:', error);
      res.status(500).json({ message: 'Fehler beim Abrufen der Zeitzone' });
    }
  })
);

/**
 * @swagger
 * /ratings:
 *   get:
 *     summary: Bewertungslabels abrufen
 *     tags: [Root]
 *     description: Gibt die Bewertungslabels aus der Konfiguration zurück.
 *     responses:
 *       200:
 *         description: Eine Liste von Bewertungslabels.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Fehler beim Abrufen der Bewertungslabels.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/ratings',
  asyncHandler(async (req, res) => {
    try {
      // Annahme: ratings ist ein Array oder Objekt aus der Konfiguration
      res.status(200).json(ratings);
    } catch (error) {
      console.error('Fehler beim Abrufen der Bewertungslabels:', error);
      res.status(500).json({ message: 'Fehler beim Abrufen der Bewertungslabels' });
    }
  })
);

module.exports = router;

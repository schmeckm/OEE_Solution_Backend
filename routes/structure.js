const express = require('express'); // Import the express module
const path = require('path'); // Import the path module
const fs = require('fs').promises; // Import the fs module with promises API
const Joi = require('joi'); // Für Eingabevalidierung
const sanitizeHtml = require('sanitize-html'); // Für Eingabesäuberung

const router = express.Router(); // Create a new router object
const structurePath = path.join(__dirname, '../config/structure.json'); // Define the path to the structure configuration file

// Zentralisiertes Fehlerhandling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Funktion zur rekursiven Säuberung von Objekten
const sanitizeObject = (obj) => {
  if (typeof obj === 'string') {
    return sanitizeHtml(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  } else if (typeof obj === 'object' && obj !== null) {
    const sanitizedObj = {};
    for (const key in obj) {
      const sanitizedKey = sanitizeHtml(key);
      sanitizedObj[sanitizedKey] = sanitizeObject(obj[key]);
    }
    return sanitizedObj;
  } else {
    return obj;
  }
};

/**
 * @swagger
 * tags:
 *   name: Structure
 *   description: API zur Verwaltung der Strukturkonfiguration
 */

/**
 * @swagger
 * /structure:
 *   get:
 *     summary: Strukturkonfiguration abrufen
 *     tags: [Structure]
 *     description: Liest die Konfiguration aus der Datei `structure.json` und sendet sie als Antwort.
 *     responses:
 *       200:
 *         description: Die Strukturkonfiguration.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Fehler beim Laden der Strukturkonfiguration.
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
      const data = await fs.readFile(structurePath, 'utf8'); // Read the structure configuration file
      const jsonData = JSON.parse(data);
      res.json(jsonData); // Send the JSON data as response
    } catch (error) {
      res.status(500).json({ message: 'Fehler beim Laden der Strukturkonfiguration' });
    }
  })
);

/**
 * @swagger
 * /structure:
 *   post:
 *     summary: Strukturkonfiguration aktualisieren
 *     tags: [Structure]
 *     description: Schreibt die neue Konfiguration in die Datei `structure.json`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Die neue Strukturkonfiguration.
 *     responses:
 *       200:
 *         description: Strukturkonfiguration erfolgreich gespeichert.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Ungültige Eingabedaten.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Fehler beim Speichern der Strukturkonfiguration.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    try {
      // Eingabevalidierung
      const schema = Joi.object().required();
      const { error, value } = schema.validate(req.body);

      if (error) {
        return res.status(400).json({ message: 'Ungültige Eingabedaten' });
      }

      // Eingabesäuberung
      const sanitizedData = sanitizeObject(value);

      // Konvertiere die gesäuberten Daten in einen JSON-String
      const newData = JSON.stringify(sanitizedData, null, 2);

      // Schreibe die neuen Daten in die Strukturkonfigurationsdatei
      await fs.writeFile(structurePath, newData, 'utf8');

      res.status(200).json({ message: 'structure.json erfolgreich gespeichert' });
    } catch (error) {
      res.status(500).json({ message: 'Fehler beim Speichern der Strukturkonfiguration' });
    }
  })
);

module.exports = router; // Export the router object for use in other files

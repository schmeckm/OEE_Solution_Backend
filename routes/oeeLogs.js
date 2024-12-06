const express = require('express');
const fs = require('fs').promises;
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

const router = express.Router();
const logFilePath = './oee-calculator.log'; // Stellen Sie sicher, dass der Pfad korrekt ist und auf das Root-Verzeichnis verweist

// Zentralisiertes Fehlerhandling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @swagger
 * tags:
 *   name: OEE Logs
 *   description: API zum Abrufen von OEE-Berechnungsprotokollen
 */

/**
 * @swagger
 * /logs:
 *   get:
 *     summary: OEE-Berechnungsprotokolle abrufen
 *     tags: [OEE Logs]
 *     description: Liest die OEE-Calculator-Logdatei und gibt gefilterte Protokolleinträge zurück.
 *     responses:
 *       200:
 *         description: Eine Liste von OEE-Protokollen.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Interner Serverfehler.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const data = await fs.readFile(logFilePath, 'utf8');
      const logs = data
        .split('\n')
        .filter((line) => line)
        .map((line) => {
          try {
            return JSON.parse(sanitizeHtml(line));
          } catch (err) {
            return null;
          }
        })
        .filter(
          (log) =>
            log !== null &&
            log.level === 'info' &&
            log.message.includes('Decoded message from topic')
        );
      res.status(200).json(logs);
    } catch (error) {
      console.error('Fehler beim Lesen der Logdatei:', error);
      res.status(500).json({ message: 'Interner Serverfehler' });
    }
  })
);

module.exports = router;

const express = require('express');
const { loadErrors, saveErrors } = require('../services/errorService'); // Import the error service
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

const router = express.Router();

// Zentralisiertes Fehlerhandling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Eingabevalidierung und -säuberung
const validateAndSanitizeError = (data) => {
  const schema = Joi.object({
    error_id: Joi.string().required(),
    message: Joi.string().required(),
    // Weitere Felder hinzufügen, falls erforderlich
  });

  const { error, value } = schema.validate(data);

  if (error) {
    throw new Error(`Ungültige Eingabedaten: ${error.details[0].message}`);
  }

  // Eingaben säubern
  value.error_id = sanitizeHtml(value.error_id);
  value.message = sanitizeHtml(value.message);
  // Weitere Felder säubern, falls erforderlich

  return value;
};

const validateAndSanitizeId = (id) => {
  const schema = Joi.string().required();
  const { error, value } = schema.validate(id);

  if (error) {
    throw new Error(`Ungültige ID: ${error.details[0].message}`);
  }

  return sanitizeHtml(value);
};

/**
 * @swagger
 * tags:
 *   name: Errors
 *   description: API zur Verwaltung von Fehlern
 */

/**
 * @swagger
 * /errors:
 *   get:
 *     summary: Alle Fehler abrufen
 *     tags: [Errors]
 *     description: Ruft eine Liste aller Fehler ab.
 *     responses:
 *       200:
 *         description: Eine Liste von Fehlern.
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
  '/errors',
  asyncHandler(async (req, res) => {
    try {
      const errors = await loadErrors();
      res.json(errors);
    } catch (error) {
      console.error('Fehler beim Laden der Fehler:', error);
      res.status(500).json({ message: 'Interner Serverfehler' });
    }
  })
);

/**
 * @swagger
 * /errors/{id}:
 *   get:
 *     summary: Einen spezifischen Fehler nach ID abrufen
 *     tags: [Errors]
 *     description: Ruft einen einzelnen Fehler anhand der ID ab.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die Fehler-ID.
 *     responses:
 *       200:
 *         description: Ein Fehlerobjekt.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Ungültige ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Fehler nicht gefunden.
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
  '/errors/:id',
  asyncHandler(async (req, res) => {
    try {
      const id = validateAndSanitizeId(req.params.id);
      const errors = await loadErrors();
      const errorItem = errors.find((err) => err.error_id === id);
      if (errorItem) {
        res.json(errorItem);
      } else {
        res.status(404).json({ message: `Fehler mit ID ${id} nicht gefunden` });
      }
    } catch (error) {
      if (error.message.startsWith('Ungültige ID')) {
        res.status(400).json({ message: error.message });
      } else {
        console.error('Fehler beim Laden der Fehler:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
      }
    }
  })
);

/**
 * @swagger
 * /errors:
 *   post:
 *     summary: Einen neuen Fehler hinzufügen
 *     tags: [Errors]
 *     description: Erstellt einen neuen Fehler.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - error_id
 *               - message
 *             properties:
 *               error_id:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Neuer Fehler erfolgreich hinzugefügt.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
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
  '/errors',
  asyncHandler(async (req, res) => {
    try {
      const newError = validateAndSanitizeError(req.body);
      const errors = await loadErrors();
      errors.push(newError);
      await saveErrors(errors);
      res.status(201).json({ message: 'Neuer Fehler erfolgreich hinzugefügt', error: newError });
    } catch (error) {
      if (error.message.startsWith('Ungültige Eingabedaten')) {
        res.status(400).json({ message: error.message });
      } else {
        console.error('Fehler beim Hinzufügen eines neuen Fehlers:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
      }
    }
  })
);

/**
 * @swagger
 * /errors/{id}:
 *   put:
 *     summary: Einen bestehenden Fehler aktualisieren
 *     tags: [Errors]
 *     description: Aktualisiert die Details eines bestehenden Fehlers.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die Fehler-ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Fehler erfolgreich aktualisiert.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Ungültige Eingabedaten.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Fehler nicht gefunden.
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
router.put(
  '/errors/:id',
  asyncHandler(async (req, res) => {
    try {
      const id = validateAndSanitizeId(req.params.id);
      const updatedError = validateAndSanitizeError({ ...req.body, error_id: id });
      const errors = await loadErrors();
      const index = errors.findIndex((err) => err.error_id === id);
      if (index !== -1) {
        errors[index] = updatedError;
        await saveErrors(errors);
        res.status(200).json({ message: `Fehler mit ID ${id} erfolgreich aktualisiert`, error: updatedError });
      } else {
        res.status(404).json({ message: `Fehler mit ID ${id} nicht gefunden` });
      }
    } catch (error) {
      if (error.message.startsWith('Ungültige Eingabedaten') || error.message.startsWith('Ungültige ID')) {
        res.status(400).json({ message: error.message });
      } else {
        console.error('Fehler beim Aktualisieren des Fehlers:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
      }
    }
  })
);

/**
 * @swagger
 * /errors/{id}:
 *   delete:
 *     summary: Einen spezifischen Fehler löschen
 *     tags: [Errors]
 *     description: Entfernt einen Fehler aus der Liste.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die Fehler-ID.
 *     responses:
 *       200:
 *         description: Fehler erfolgreich gelöscht.
 *       400:
 *         description: Ungültige ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Fehler nicht gefunden.
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
router.delete(
  '/errors/:id',
  asyncHandler(async (req, res) => {
    try {
      const id = validateAndSanitizeId(req.params.id);
      const errors = await loadErrors();
      const initialLength = errors.length;
      const filteredErrors = errors.filter((err) => err.error_id !== id);
      if (filteredErrors.length !== initialLength) {
        await saveErrors(filteredErrors);
        res.status(200).json({ message: `Fehler mit ID ${id} erfolgreich gelöscht` });
      } else {
        res.status(404).json({ message: `Fehler mit ID ${id} nicht gefunden` });
      }
    } catch (error) {
      if (error.message.startsWith('Ungültige ID')) {
        res.status(400).json({ message: error.message });
      } else {
        console.error('Fehler beim Löschen des Fehlers:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
      }
    }
  })
);

module.exports = router;

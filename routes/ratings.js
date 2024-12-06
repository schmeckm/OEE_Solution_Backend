const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

const router = express.Router();
const configPath = path.join(__dirname, '../config/config.json');

/**
 * Helper function to load the config file asynchronously.
 */
const loadConfig = async () => {
  const data = await fs.readFile(configPath, 'utf8');
  return JSON.parse(data);
};

/**
 * Helper function to save the config file asynchronously.
 */
const saveConfig = async (config) => {
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
};

// Zentralisiertes Fehlerhandling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Eingabevalidierung und -säuberung
const validateAndSanitizeRating = (data) => {
  const schema = Joi.object({
    description: Joi.string().required(),
    color: Joi.string().required(),
    // Weitere Felder hinzufügen, falls erforderlich
  });

  const { error, value } = schema.validate(data);

  if (error) {
    throw new Error(error.details[0].message);
  }

  // Eingaben säubern
  value.description = sanitizeHtml(value.description);
  value.color = sanitizeHtml(value.color);

  return value;
};

/**
 * @swagger
 * tags:
 *   name: Ratings
 *   description: API zur Verwaltung von Ratings
 */

/**
 * @swagger
 * /ratings:
 *   get:
 *     summary: Alle Ratings abrufen
 *     tags: [Ratings]
 *     description: Ruft eine Liste aller Ratings ab.
 *     responses:
 *       200:
 *         description: Eine Liste von Ratings.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Rating'
 *       500:
 *         description: Fehler beim Laden der Ratings.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const config = await loadConfig();
      res.json(config.ratings);
    } catch (error) {
      res.status(500).json({ message: 'Fehler beim Laden der Ratings' });
    }
  })
);

/**
 * @swagger
 * /ratings/{id}:
 *   get:
 *     summary: Ein bestimmtes Rating nach ID abrufen
 *     tags: [Ratings]
 *     description: Ruft ein einzelnes Rating anhand der ID ab.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die Rating-ID (UUID).
 *     responses:
 *       200:
 *         description: Ein Rating-Objekt.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Rating'
 *       400:
 *         description: Ungültige ID.
 *       404:
 *         description: Rating nicht gefunden.
 *       500:
 *         description: Fehler beim Laden des Ratings.
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    try {
      const id = sanitizeHtml(req.params.id);

      // Validierung der ID
      const schema = Joi.string().uuid().required();
      const { error } = schema.validate(id);
      if (error) {
        return res.status(400).json({ message: 'Ungültige ID' });
      }

      const config = await loadConfig();
      const rating = config.ratings.find((r) => r.id === id);

      if (rating) {
        res.json(rating);
      } else {
        res.status(404).json({ message: `Rating mit ID ${id} nicht gefunden` });
      }
    } catch (error) {
      res.status(500).json({ message: 'Fehler beim Laden des Ratings' });
    }
  })
);

/**
 * @swagger
 * /ratings:
 *   post:
 *     summary: Ein neues Rating hinzufügen
 *     tags: [Ratings]
 *     description: Erstellt ein neues Rating.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RatingInput'
 *     responses:
 *       201:
 *         description: Rating erfolgreich erstellt.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Rating'
 *       400:
 *         description: Ungültige Eingabedaten.
 *       500:
 *         description: Fehler beim Speichern des Ratings.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const config = await loadConfig();
      const sanitizedData = validateAndSanitizeRating(req.body);

      // Generiere eine neue UUID für das Rating
      sanitizedData.id = uuidv4();

      // Füge das neue Rating hinzu
      config.ratings.push(sanitizedData);
      await saveConfig(config);

      res.status(201).json(sanitizedData);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  })
);

/**
 * @swagger
 * /ratings/{id}:
 *   put:
 *     summary: Ein bestehendes Rating aktualisieren
 *     tags: [Ratings]
 *     description: Aktualisiert die Details eines bestehenden Ratings.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die Rating-ID (UUID).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RatingInput'
 *     responses:
 *       200:
 *         description: Rating erfolgreich aktualisiert.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Rating'
 *       400:
 *         description: Ungültige Eingabedaten oder ID.
 *       404:
 *         description: Rating nicht gefunden.
 *       500:
 *         description: Fehler beim Aktualisieren des Ratings.
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    try {
      const id = sanitizeHtml(req.params.id);

      // Validierung der ID
      const idSchema = Joi.string().uuid().required();
      const { error: idError } = idSchema.validate(id);
      if (idError) {
        return res.status(400).json({ message: 'Ungültige ID' });
      }

      const config = await loadConfig();
      const index = config.ratings.findIndex((r) => r.id === id);

      if (index !== -1) {
        const sanitizedData = validateAndSanitizeRating(req.body);
        sanitizedData.id = id; // Behalte die originale ID

        config.ratings[index] = { ...config.ratings[index], ...sanitizedData };
        await saveConfig(config);
        res.status(200).json(config.ratings[index]);
      } else {
        res.status(404).json({ message: `Rating mit ID ${id} nicht gefunden` });
      }
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  })
);

/**
 * @swagger
 * /ratings/{id}:
 *   delete:
 *     summary: Ein Rating löschen
 *     tags: [Ratings]
 *     description: Entfernt ein Rating aus der Liste.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die Rating-ID (UUID).
 *     responses:
 *       204:
 *         description: Rating erfolgreich gelöscht.
 *       400:
 *         description: Ungültige ID.
 *       404:
 *         description: Rating nicht gefunden.
 *       500:
 *         description: Fehler beim Löschen des Ratings.
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    try {
      const id = sanitizeHtml(req.params.id);

      // Validierung der ID
      const schema = Joi.string().uuid().required();
      const { error } = schema.validate(id);
      if (error) {
        return res.status(400).json({ message: 'Ungültige ID' });
      }

      const config = await loadConfig();
      const initialLength = config.ratings.length;

      // Filtere das Rating mit der angegebenen ID heraus
      config.ratings = config.ratings.filter((r) => r.id !== id);

      if (config.ratings.length !== initialLength) {
        await saveConfig(config);
        res.status(204).send();
      } else {
        res.status(404).json({ message: `Rating mit ID ${id} nicht gefunden` });
      }
    } catch (error) {
      res.status(500).json({ message: 'Fehler beim Löschen des Ratings' });
    }
  })
);

module.exports = router;

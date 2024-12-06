const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

const router = express.Router();

const configPath = path.join(__dirname, '../data/tact.json');

// Zentralisiertes Fehlerhandling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Eingabedaten validieren und säubern
const validateAndSanitizeTact = (data) => {
  const schema = Joi.object({
    machine: Joi.string().required(),
    material: Joi.string().required(),
    sollMax: Joi.number().required(),
    sollMin: Joi.number().required(),
  });

  const { error, value } = schema.validate(data);

  if (error) {
    throw new Error(error.details[0].message);
  }

  // Eingaben säubern
  value.machine = sanitizeHtml(value.machine);
  value.material = sanitizeHtml(value.material);

  return value;
};

// Async function to load tact data
const loadTactData = async () => {
  try {
    const data = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    throw new Error('Failed to load tact data');
  }
};

// Async function to save tact data
const saveTactData = async (data) => {
  try {
    await fs.writeFile(configPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    throw new Error('Failed to save tact data');
  }
};

/**
 * @swagger
 * tags:
 *   name: Tact
 *   description: API zur Verwaltung von Tact-Daten. Definiert, wie schnell die Maschine für ein bestimmtes Material laufen darf.
 */

/**
 * @swagger
 * /tact:
 *   get:
 *     summary: Alle Tact-Einträge abrufen
 *     tags: [Tact]
 *     description: Ruft eine Liste aller Tact-Einträge ab.
 *     responses:
 *       200:
 *         description: Eine Liste von Tact-Einträgen.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tact'
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const tactData = await loadTactData();
      res.json(tactData);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  })
);

/**
 * @swagger
 * /tact/{id}:
 *   get:
 *     summary: Einen bestimmten Tact-Eintrag nach ID abrufen
 *     tags: [Tact]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die Tact-ID (UUID).
 *     responses:
 *       200:
 *         description: Ein Tact-Eintrag.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tact'
 *       400:
 *         description: Ungültige ID.
 *       404:
 *         description: Tact-Eintrag nicht gefunden.
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

      const tactData = await loadTactData();
      const tact = tactData.find((t) => t.id === id);

      if (tact) {
        res.json(tact);
      } else {
        res.status(404).json({ message: `Tact-Eintrag mit ID ${id} nicht gefunden` });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  })
);

/**
 * @swagger
 * /tact:
 *   post:
 *     summary: Einen neuen Tact-Eintrag erstellen
 *     tags: [Tact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TactInput'
 *     responses:
 *       201:
 *         description: Tact-Eintrag erfolgreich erstellt.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tact'
 *       400:
 *         description: Ungültige Eingabedaten.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const tactData = await loadTactData();
      const sanitizedData = validateAndSanitizeTact(req.body);

      // Neue ID generieren
      sanitizedData.id = uuidv4();

      tactData.push(sanitizedData);
      await saveTactData(tactData);

      res.status(201).json(sanitizedData);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  })
);

/**
 * @swagger
 * /tact/{id}:
 *   put:
 *     summary: Einen bestehenden Tact-Eintrag aktualisieren
 *     tags: [Tact]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die Tact-ID (UUID).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TactInput'
 *     responses:
 *       200:
 *         description: Tact-Eintrag erfolgreich aktualisiert.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tact'
 *       400:
 *         description: Ungültige Eingabedaten oder ID.
 *       404:
 *         description: Tact-Eintrag nicht gefunden.
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

      const tactData = await loadTactData();
      const index = tactData.findIndex((t) => t.id === id);

      if (index !== -1) {
        const sanitizedData = validateAndSanitizeTact(req.body);
        sanitizedData.id = id;

        tactData[index] = { ...tactData[index], ...sanitizedData };
        await saveTactData(tactData);

        res.status(200).json(tactData[index]);
      } else {
        res.status(404).json({ message: `Tact-Eintrag mit ID ${id} nicht gefunden` });
      }
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  })
);

/**
 * @swagger
 * /tact/{id}:
 *   delete:
 *     summary: Einen Tact-Eintrag löschen
 *     tags: [Tact]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die Tact-ID (UUID).
 *     responses:
 *       204:
 *         description: Tact-Eintrag erfolgreich gelöscht.
 *       400:
 *         description: Ungültige ID.
 *       404:
 *         description: Tact-Eintrag nicht gefunden.
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

      let tactData = await loadTactData();
      const initialLength = tactData.length;
      tactData = tactData.filter((t) => t.id !== id);

      if (tactData.length !== initialLength) {
        await saveTactData(tactData);
        res.status(204).send();
      } else {
        res.status(404).json({ message: `Tact-Eintrag mit ID ${id} nicht gefunden` });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  })
);

module.exports = router;

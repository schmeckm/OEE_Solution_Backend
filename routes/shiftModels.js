const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

const {
  loadShiftModels,
  saveShiftModels,
  loadShiftModelsByMachineId,
} = require('../services/shiftModelService');

const router = express.Router();

// Zentralisiertes Fehlerhandling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Eingabevalidierung und -säuberung
const validateAndSanitizeShiftModel = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().optional().allow(''),
    machine_id: Joi.string().required(), // Passen Sie dies an Ihr Datenmodell an
    // Weitere Felder nach Bedarf hinzufügen
  });

  const { error, value } = schema.validate(data);

  if (error) {
    throw new Error(error.details[0].message);
  }

  // Eingaben säubern
  value.name = sanitizeHtml(value.name);
  if (value.description) {
    value.description = sanitizeHtml(value.description);
  }
  value.machine_id = sanitizeHtml(value.machine_id);

  return value;
};

/**
 * @swagger
 * tags:
 *   name: Shift Models
 *   description: API zur Verwaltung von Schichtmodellen
 */

/**
 * @swagger
 * /shiftmodels:
 *   get:
 *     summary: Alle Schichtmodelle abrufen
 *     tags: [Shift Models]
 *     description: Ruft eine Liste aller Schichtmodelle ab.
 *     responses:
 *       200:
 *         description: Eine Liste von Schichtmodellen.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ShiftModel'
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const shiftModels = await loadShiftModels();
    res.json(shiftModels);
  })
);

/**
 * @swagger
 * /shiftmodels/{id}:
 *   get:
 *     summary: Ein bestimmtes Schichtmodell abrufen
 *     tags: [Shift Models]
 *     description: Ruft ein einzelnes Schichtmodell anhand der ID ab.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string  // ID ist eine UUID
 *         description: Die Schichtmodell-ID.
 *     responses:
 *       200:
 *         description: Ein Schichtmodell-Objekt.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShiftModel'
 *       400:
 *         description: Ungültige ID.
 *       404:
 *         description: Schichtmodell nicht gefunden.
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = sanitizeHtml(req.params.id);

    // Validierung der ID
    const idSchema = Joi.string().uuid().required();
    const { error } = idSchema.validate(id);
    if (error) {
      return res.status(400).json({ message: 'Ungültige ID' });
    }

    const shiftModels = await loadShiftModels();
    const shiftModel = shiftModels.find((sm) => sm.shift_id === id);
    if (shiftModel) {
      res.json(shiftModel);
    } else {
      res.status(404).json({ message: `Schichtmodell mit ID ${id} nicht gefunden` });
    }
  })
);

/**
 * @swagger
 * /shiftmodels/machine/{machine_id}:
 *   get:
 *     summary: Schichtmodelle nach Maschinen-ID abrufen
 *     tags: [Shift Models]
 *     description: Ruft Schichtmodelle ab, die mit einer bestimmten Maschinen-ID verknüpft sind.
 *     parameters:
 *       - in: path
 *         name: machine_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die Maschinen-ID zur Filterung der Schichtmodelle.
 *     responses:
 *       200:
 *         description: Eine Liste von Schichtmodellen, die mit der Maschinen-ID verknüpft sind.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ShiftModel'
 *       400:
 *         description: Ungültige Maschinen-ID.
 *       404:
 *         description: Keine Schichtmodelle für die gegebene Maschinen-ID gefunden.
 */
router.get(
  '/machine/:machine_id',
  asyncHandler(async (req, res) => {
    const machineId = sanitizeHtml(req.params.machine_id);

    // Validierung der Maschinen-ID
    const machineIdSchema = Joi.string().required();
    const { error } = machineIdSchema.validate(machineId);
    if (error) {
      return res.status(400).json({ message: 'Ungültige Maschinen-ID' });
    }

    const shiftModels = await loadShiftModelsByMachineId(machineId);

    if (shiftModels.length > 0) {
      res.json(shiftModels);
    } else {
      res.status(404).json({ message: `Keine Schichtmodelle für Maschinen-ID ${machineId} gefunden` });
    }
  })
);

/**
 * @swagger
 * /shiftmodels:
 *   post:
 *     summary: Ein neues Schichtmodell hinzufügen
 *     tags: [Shift Models]
 *     description: Erstellt ein neues Schichtmodell.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShiftModelInput'
 *     responses:
 *       201:
 *         description: Schichtmodell erfolgreich hinzugefügt.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShiftModel'
 *       400:
 *         description: Ungültige Eingabedaten.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const shiftModels = await loadShiftModels();
      const sanitizedData = validateAndSanitizeShiftModel(req.body);

      // Neue UUID generieren
      sanitizedData.shift_id = uuidv4();

      shiftModels.push(sanitizedData);
      await saveShiftModels(shiftModels);
      res.status(201).json(sanitizedData);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  })
);

/**
 * @swagger
 * /shiftmodels/{id}:
 *   put:
 *     summary: Ein bestehendes Schichtmodell aktualisieren
 *     tags: [Shift Models]
 *     description: Aktualisiert die Details eines bestehenden Schichtmodells.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string  // ID ist eine UUID
 *         description: Die Schichtmodell-ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShiftModelInput'
 *     responses:
 *       200:
 *         description: Schichtmodell erfolgreich aktualisiert.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShiftModel'
 *       400:
 *         description: Ungültige Eingabedaten oder ID.
 *       404:
 *         description: Schichtmodell nicht gefunden.
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

      const shiftModels = await loadShiftModels();
      const index = shiftModels.findIndex((sm) => sm.shift_id === id);
      if (index !== -1) {
        const sanitizedData = validateAndSanitizeShiftModel(req.body);
        sanitizedData.shift_id = id; // Originale ID beibehalten

        shiftModels[index] = { ...shiftModels[index], ...sanitizedData };
        await saveShiftModels(shiftModels);
        res.status(200).json(shiftModels[index]);
      } else {
        res.status(404).json({ message: `Schichtmodell mit ID ${id} nicht gefunden` });
      }
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  })
);

/**
 * @swagger
 * /shiftmodels/{id}:
 *   delete:
 *     summary: Ein Schichtmodell löschen
 *     tags: [Shift Models]
 *     description: Entfernt ein Schichtmodell aus der Liste.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string  // ID ist eine UUID
 *         description: Die Schichtmodell-ID.
 *     responses:
 *       204:
 *         description: Schichtmodell erfolgreich gelöscht.
 *       400:
 *         description: Ungültige ID.
 *       404:
 *         description: Schichtmodell nicht gefunden.
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    try {
      const id = sanitizeHtml(req.params.id);

      // Validierung der ID
      const idSchema = Joi.string().uuid().required();
      const { error } = idSchema.validate(id);
      if (error) {
        return res.status(400).json({ message: 'Ungültige ID' });
      }

      let shiftModels = await loadShiftModels();
      const initialLength = shiftModels.length;
      shiftModels = shiftModels.filter((sm) => sm.shift_id !== id);
      if (shiftModels.length !== initialLength) {
        await saveShiftModels(shiftModels);
        res.status(204).send();
      } else {
        res.status(404).json({ message: `Schichtmodell mit ID ${id} nicht gefunden` });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  })
);

module.exports = router;

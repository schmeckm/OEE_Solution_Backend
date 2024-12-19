const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');
const {
  getAll,
  getById,
  create,
  update,
  delete: deleteShiftModel,
  getByWorkcenterId  // Importiere die neue Funktion
} = require('../services/shiftModelService');

const router = express.Router();

// Centralized error handling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Input validation and sanitization
const validateAndSanitizeShiftModel = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().optional().allow(''),
    workcenter_id: Joi.string().required(),  // Anpassung an das Datenmodell
  });

  const { error, value } = schema.validate(data);

  if (error) {
    throw new Error(error.details[0].message);
  }

  // Sanitize inputs
  value.name = sanitizeHtml(value.name);
  if (value.description) {
    value.description = sanitizeHtml(value.description);
  }
  value.workcenter_id = sanitizeHtml(value.workcenter_id);

  return value;
};

/**
 * @swagger
 * tags:
 *   name: Shift Models
 *   description: API for managing shift models
 */

/**
 * @swagger
 * /shiftmodels:
 *   get:
 *     summary: Get all shift models
 *     tags: [Shift Models]
 *     responses:
 *       200:
 *         description: List of shift models.
 */
router.get('/', asyncHandler(async (req, res) => {
    const shiftModels = await getAll();
    res.json(shiftModels);
}));

/**
 * @swagger
 * /shiftmodels/{id}:
 *   get:
 *     summary: Get a shift model by ID
 *     tags: [Shift Models]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the shift model
 *     responses:
 *       200:
 *         description: The shift model data.
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const shiftModel = await getById(req.params.id);
    res.json(shiftModel);
}));

/**
 * @swagger
 * /shiftmodels/workcenter/{workcenter_id}:
 *   get:
 *     summary: Get shift models by workcenter_id
 *     tags: [Shift Models]
 *     parameters:
 *       - in: path
 *         name: workcenter_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The workcenter_id to filter by.
 *     responses:
 *       200:
 *         description: A list of shift models associated with the given workcenter_id.
 */
router.get('/workcenter/:workcenter_id', asyncHandler(async (req, res) => {
    const shiftModels = await getByWorkcenterId(req.params.workcenter_id);
    res.json(shiftModels);
}));

/**
 * @swagger
 * /shiftmodels:
 *   post:
 *     summary: Create a new shift model
 *     tags: [Shift Models]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShiftModelInput'
 *     responses:
 *       201:
 *         description: Successfully created shift model.
 */
router.post('/', asyncHandler(async (req, res) => {
    const sanitizedData = validateAndSanitizeShiftModel(req.body);
    sanitizedData.shift_id = uuidv4();
    const newShiftModel = await create(sanitizedData);
    res.status(201).json(newShiftModel);
}));

/**
 * @swagger
 * /shiftmodels/{id}:
 *   put:
 *     summary: Update an existing shift model
 *     tags: [Shift Models]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the shift model to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShiftModelInput'
 *     responses:
 *       200:
 *         description: Successfully updated shift model.
 */
router.put('/:id', asyncHandler(async (req, res) => {
    const updatedShiftModel = await update(req.params.id, req.body);
    res.status(200).json(updatedShiftModel);
}));

/**
 * @swagger
 * /shiftmodels/{id}:
 *   delete:
 *     summary: Delete a shift model
 *     tags: [Shift Models]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the shift model to delete.
 *     responses:
 *       204:
 *         description: Successfully deleted shift model.
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    await deleteShiftModel(req.params.id);
    res.status(204).send();
}));

module.exports = router;

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { oeeLogger } = require('../utils/logger'); // Pfad anpassen, um den korrekten Import des oeeLoggers zu gewährleisten.

const {
  loadWorkCenters,
  updateWorkCenter,
  loadWorkCenterById,
  createWorkCenter,
  deleteWorkCenter
} = require('../services/workCenterService');

const router = express.Router();

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((error) => {
    oeeLogger.error(error.message, { stack: error.stack }); // Log the error with oeeLogger
    next(error); // Propagate the error forward
  });

const validateWorkCenter = [
  body('workcenter_id').isUUID().withMessage('Workcenter ID must be a valid UUID'),
  body('plant').trim().isLength({ min: 1 }).withMessage('Plant must not be empty'),
  body('area').trim().isLength({ min: 1 }).withMessage('Area must not be empty'),
  body('name').trim().isLength({ min: 1 }).withMessage('Name must not be empty'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

/**
 * @swagger
 * components:
 *   schemas:
 *     WorkCenter:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - status
 *       properties:
 *         id:
 *           type: string
 *           description: The unique identifier of the work center.
 *         name:
 *           type: string
 *           description: The name of the work center.
 *         status:
 *           type: string
 *           description: The current status of the work center (e.g., active, inactive).
 *     WorkCenterInput:
 *       type: object
 *       required:
 *         - name
 *         - status
 *       properties:
 *         name:
 *           type: string
 *           description: The name of the work center.
 *         status:
 *           type: string
 *           description: The desired status of the work center (e.g., active, inactive).
 * tags:
 *   - name: Work Centers
 *     description: Operations on Work Centers
 */

/**
 * @swagger
 * /workcenters:
 *   get:
 *     summary: Get all work centers
 *     tags: [Work Centers]
 *     responses:
 *       200:
 *         description: The list of work centers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WorkCenter'
 */
router.get('/', asyncHandler(async (req, res) => {
  const workCenters = await loadWorkCenters();
  oeeLogger.info('Loaded all work centers');
  res.json(workCenters);
}));

/**
 * @swagger
 * /workcenters/{id}:
 *   get:
 *     summary: Get a work center by ID
 *     tags: [Work Centers]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The work center ID
 *     responses:
 *       200:
 *         description: The work center description by ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkCenter'
 *       404:
 *         description: Work center not found
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const workCenter = await loadWorkCenterById(id);
  if (!workCenter) {
    oeeLogger.error(`Work center not found: ${id}`);
    return res.status(404).json({ message: 'Work center not found', id });
  }
  oeeLogger.info(`Work center retrieved: ${id}`);
  res.json(workCenter);
}));

/**
 * @swagger
 * /workcenters:
 *   post:
 *     summary: Create a new work center
 *     tags: [Work Centers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WorkCenterInput'
 *     responses:
 *       201:
 *         description: The work center was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkCenter'
 *       400:
 *         description: Bad request
 */
router.post('/', validateWorkCenter, asyncHandler(async (req, res) => {
  const newWorkCenter = await createWorkCenter(req.body);
  oeeLogger.info(`Work center created successfully: ${newWorkCenter.id}`);
  res.status(201).json({ message: 'Work center created successfully', workCenter: newWorkCenter });
}));

/**
 * @swagger
 * /workcenters/{id}:
 *   put:
 *     summary: Update an existing work center
 *     tags: [Work Centers]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The work center ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WorkCenterInput'
 *     responses:
 *       200:
 *         description: The work center was successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkCenter'
 *       404:
 *         description: Work center not found
 *       400:
 *         description: Bad request
 */
router.put('/:id', validateWorkCenter, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedWorkCenter = await updateWorkCenter(id, req.body);
  if (!updatedWorkCenter) {
    oeeLogger.error(`Failed to update work center: ${id}`);
    return res.status(404).json({ message: 'Work center not found', id });
  }
  oeeLogger.info(`Work center updated successfully: ${id}`);
  res.status(200).json({ message: 'Work center updated successfully', workCenter: updatedWorkCenter });
}));

/**
 * @swagger
 * /workcenters/{id}:
 *   delete:
 *     summary: Delete a work center
 *     tags: [Work Centers]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The work center ID
 *     responses:
 *       204:
 *         description: The work center was successfully deleted
 *       404:
 *         description: Work center not found
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await deleteWorkCenter(id);
  if (!result) {
    oeeLogger.error(`Failed to delete work center: ${id}`);
    return res.status(404).json({ message: 'Work center not found', id });
  }
  oeeLogger.info(`Work center deleted successfully: ${id}`);
  res.status(204).send();
}));

module.exports = router;

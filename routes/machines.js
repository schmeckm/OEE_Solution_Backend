const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { loadWorkCenters, updateWorkCenter, loadWorkCenterById, createWorkCenter, deleteWorkCenter } = require('../services/workCenterService'); 
const router = express.Router();
const { dateSettings } = require("../config/config");
/**
 * @swagger
 * /workcenters:
 *   get:
 *     summary: Get all work centers
 *     tags: [Work Centers]
 *     description: Retrieve a list of all work centers.
 *     responses:
 *       200:
 *         description: A list of work centers.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WorkCenter'
 */
router.get('/', async (req, res) => {
  try {
    const workCenters = await loadWorkCenters();  // Rufe die Work Centers aus dem Service ab
    res.json(workCenters);
  } catch (error) {
    res.status(500).json({ message: error.message });  // Fehlerbehandlung direkt hier
  }
});

/**
 * @swagger
 * /workcenters/{id}:
 *   get:
 *     summary: Get a specific work center by ID
 *     tags: [Work Centers]
 *     description: Retrieve a work center based on its unique ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the work center.
 *     responses:
 *       200:
 *         description: A work center object.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkCenter'
 *       404:
 *         description: Work center not found.
 */
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const workCenter = await loadWorkCenterById(id);  // Rufe das Work Center nach ID ab
    res.json(workCenter);
  } catch (error) {
    res.status(404).json({ message: error.message });  // Fehlerbehandlung direkt hier
  }
});

/**
 * @swagger
 * /workcenters:
 *   post:
 *     summary: Add a new work center
 *     tags: [Work Centers]
 *     description: Creates a new work center with the provided details.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WorkCenterInput'
 *     responses:
 *       201:
 *         description: Work center added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 workCenter:
 *                   $ref: '#/components/schemas/WorkCenter'
 *       400:
 *         description: Invalid input data.
 */
router.post('/', async (req, res) => {
  try {
    const newWorkCenter = await createWorkCenter(req.body);  // Work Center erstellen
    res.status(201).json({ message: 'Work center created successfully', workCenter: newWorkCenter });
  } catch (error) {
    res.status(400).json({ message: error.message });  // Fehlerbehandlung direkt hier
  }
});

/**
 * @swagger
 * /workcenters/{id}:
 *   put:
 *     summary: Update an existing work center
 *     tags: [Work Centers]
 *     description: Update an existing work center with the provided data.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the work center.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WorkCenterInput'
 *     responses:
 *       200:
 *         description: Work center updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 workCenter:
 *                   $ref: '#/components/schemas/WorkCenter'
 *       400:
 *         description: Invalid input data.
 *       404:
 *         description: Work center not found.
 */
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const updatedWorkCenter = await updateWorkCenter(id, req.body);  // Work Center aktualisieren
    res.status(200).json({ message: 'Work center updated successfully', workCenter: updatedWorkCenter });
  } catch (error) {
    res.status(400).json({ message: error.message });  // Fehlerbehandlung direkt hier
  }
});

/**
 * @swagger
 * /workcenters/{id}:
 *   delete:
 *     summary: Delete a work center
 *     tags: [Work Centers]
 *     description: Remove a work center from the list based on its unique ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the work center.
 *     responses:
 *       204:
 *         description: Work center deleted successfully.
 *       404:
 *         description: Work center not found.
 */
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await deleteWorkCenter(id);  // Work Center löschen
    res.status(204).send();  // Erfolgreich gelöscht
  } catch (error) {
    res.status(404).json({ message: error.message });  // Fehlerbehandlung direkt hier
  }
});

module.exports = router;

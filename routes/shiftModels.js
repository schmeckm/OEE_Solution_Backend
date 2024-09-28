const express = require('express');
const { loadShiftModels, saveShiftModels, loadShiftModelsByMachineId } = require('../services/shiftModelService'); // Import Shift model service

const router = express.Router();

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
 *     description: Retrieve a list of all shift models.
 *     responses:
 *       200:
 *         description: A list of shift models.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/', (req, res) => {
    const shiftModels = loadShiftModels();
    res.json(shiftModels);
});

/**
 * @swagger
 * /shiftmodels/{id}:
 *   get:
 *     summary: Get a specific shift model
 *     tags: [Shift Models]
 *     description: Retrieve a single shift model by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The shift model ID.
 *     responses:
 *       200:
 *         description: A specific shift model object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Shift model not found.
 */
router.get('/:id', (req, res) => {
    const shiftModels = loadShiftModels();
    const shiftModel = shiftModels.find(sm => sm.shift_id === parseInt(req.params.id));
    if (shiftModel) {
        res.json(shiftModel);
    } else {
        res.status(404).json({ message: `Shift model with ID ${req.params.id} not found` });
    }
});

/**
 * @swagger
 * /shiftmodels/machine/{machine_id}:
 *   get:
 *     summary: Get shift models by machine ID
 *     tags: [Shift Models]
 *     description: Retrieve shift models associated with a specific machine ID.
 *     parameters:
 *       - in: path
 *         name: machine_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The machine ID to filter shift models by.
 *     responses:
 *       200:
 *         description: A list of shift models associated with the machine ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       404:
 *         description: No shift models found for the given machine ID.
 */
router.get('/machine/:machine_id', (req, res) => {
    const machineId = req.params.machine_id;
    const shiftModels = loadShiftModelsByMachineId(machineId);

    if (shiftModels.length > 0) {
        res.json(shiftModels);
    } else {
        res.status(404).json({ message: `No shift models found for machine ID ${machineId}` });
    }
});

/**
 * @swagger
 * /shiftmodels:
 *   post:
 *     summary: Add a new shift model
 *     tags: [Shift Models]
 *     description: Create a new shift model.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Shift model added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 shiftModel:
 *                   type: object
 */
router.post('/', (req, res) => {
    const shiftModels = loadShiftModels();
    const newShiftModel = req.body;
    newShiftModel.shift_id = shiftModels.length ? Math.max(...shiftModels.map(sm => sm.shift_id)) + 1 : 1;
    shiftModels.push(newShiftModel);
    saveShiftModels(shiftModels);
    res.status(201).json({ message: 'New shift model added successfully', shiftModel: newShiftModel });
});

/**
 * @swagger
 * /shiftmodels/{id}:
 *   put:
 *     summary: Update an existing shift model
 *     tags: [Shift Models]
 *     description: Update the details of an existing shift model.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The shift model ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shift model updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 shiftModel:
 *                   type: object
 *       404:
 *         description: Shift model not found.
 */
router.put('/:id', (req, res) => {
    const shiftModels = loadShiftModels();
    const index = shiftModels.findIndex(sm => sm.shift_id === parseInt(req.params.id));
    if (index !== -1) {
        shiftModels[index] = {...shiftModels[index], ...req.body };
        saveShiftModels(shiftModels);
        res.status(200).json({ message: 'Shift model updated successfully', shiftModel: shiftModels[index] });
    } else {
        res.status(404).json({ message: `Shift model with ID ${req.params.id} not found` });
    }
});

/**
 * @swagger
 * /shiftmodels/{id}:
 *   delete:
 *     summary: Delete a shift model
 *     tags: [Shift Models]
 *     description: Remove a shift model from the list.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The shift model ID.
 *     responses:
 *       200:
 *         description: Shift model deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Shift model not found.
 */
router.delete('/:id', (req, res) => {
    let shiftModels = loadShiftModels();
    const initialLength = shiftModels.length;
    shiftModels = shiftModels.filter(sm => sm.shift_id !== parseInt(req.params.id));
    if (shiftModels.length !== initialLength) {
        saveShiftModels(shiftModels);
        res.status(200).json({ message: 'Shift model deleted successfully' });
    } else {
        res.status(404).json({ message: `Shift model with ID ${req.params.id} not found` });
    }
});

module.exports = router;
const express = require('express');
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs
const { loadMachines, saveMachines } = require('../services/machineService');
const { body, param, validationResult } = require('express-validator'); // For validation

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Machines
 *   description: API for managing machines
 */

/**
 * @swagger
 * /machines:
 *   get:
 *     summary: Get all machines
 *     tags: [Machines]
 *     description: Retrieve a list of all machines.
 *     responses:
 *       200:
 *         description: A list of machines.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/', async (req, res) => {
    try {
        const machines = await loadMachines(); // Load all machines asynchronously
        res.json(machines || []); // Return the list of machines or an empty array
    } catch (error) {
        console.error('Error loading machines:', error);
        res.status(500).json({ message: 'Failed to load machines' });
    }
});

/**
 * @swagger
 * /machines/{id}:
 *   get:
 *     summary: Get a specific machine
 *     tags: [Machines]
 *     description: Retrieve a single machine by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The machine ID.
 *     responses:
 *       200:
 *         description: A machine object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Machine not found.
 */
router.get('/:id', param('id').isUUID(), async (req, res) => {
    try {
        const machines = await loadMachines();
        const machine = machines.find(m => m.machine_id === req.params.id);
        if (machine) {
            res.json(machine);
        } else {
            res.status(404).json({ message: `Machine with ID ${req.params.id} not found` });
        }
    } catch (error) {
        console.error('Error retrieving machine:', error);
        res.status(500).json({ message: 'Failed to retrieve machine' });
    }
});

/**
 * @swagger
 * /machines:
 *   post:
 *     summary: Add a new machine
 *     tags: [Machines]
 *     description: Create a new machine.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       201:
 *         description: Machine created successfully.
 */
router.post(
    '/',
    body('name').isString().notEmpty(),
    body('type').isString().notEmpty(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const machines = await loadMachines();
            const newMachine = {
                machine_id: uuidv4(), // Generate a unique ID
                ...req.body
            };
            machines.push(newMachine);
            await saveMachines(machines);
            res.status(201).json({ message: 'New machine added successfully', machine: newMachine });
        } catch (error) {
            console.error('Error creating machine:', error);
            res.status(500).json({ message: 'Failed to create machine' });
        }
    }
);

/**
 * @swagger
 * /machines/{id}:
 *   put:
 *     summary: Update an existing machine
 *     tags: [Machines]
 *     description: Update the details of an existing machine.
 */
router.put(
    '/:id',
    param('id').isUUID(),
    body('name').optional().isString(),
    body('type').optional().isString(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const machines = await loadMachines();
            const index = machines.findIndex(m => m.machine_id === req.params.id);
            if (index !== -1) {
                machines[index] = { ...machines[index], ...req.body };
                await saveMachines(machines);
                res.status(200).json({ message: 'Machine updated successfully', machine: machines[index] });
            } else {
                res.status(404).json({ message: `Machine with ID ${req.params.id} not found` });
            }
        } catch (error) {
            console.error('Error updating machine:', error);
            res.status(500).json({ message: 'Failed to update machine' });
        }
    }
);

/**
 * @swagger
 * /machines/{id}:
 *   delete:
 *     summary: Delete a machine
 *     tags: [Machines]
 *     description: Remove a machine from the list.
 */
router.delete('/:id', param('id').isUUID(), async (req, res) => {
    try {
        let machines = await loadMachines();
        const initialLength = machines.length;
        machines = machines.filter(m => m.machine_id !== req.params.id);
        if (machines.length !== initialLength) {
            await saveMachines(machines);
            res.status(200).json({ message: 'Machine deleted successfully' });
        } else {
            res.status(404).json({ message: `Machine with ID ${req.params.id} not found` });
        }
    } catch (error) {
        console.error('Error deleting machine:', error);
        res.status(500).json({ message: 'Failed to delete machine' });
    }
});

module.exports = router;

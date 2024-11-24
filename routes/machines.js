const express = require('express');
const { loadMachines, saveMachines } = require('../services/machineService');
const { v4: uuidv4 } = require('uuid');

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
router.get('/', (req, res) => {
    const machines = loadMachines(); // Load all machines from the service
    res.json(machines);
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
router.get('/:id', (req, res) => {
    const machines = loadMachines();
    const machine = machines.find((m) => m.machine_id === req.params.id);
    if (machine) {
        res.json(machine);
    } else {
        res.status(404).json({ message: `Machine with ID ${req.params.id} not found` });
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
 *               description:
 *                 type: string
 *               OEE:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Machine created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 machine:
 *                   type: object
 */
router.post('/', (req, res) => {
    const machines = loadMachines();
    const newMachine = { ...req.body, machine_id: uuidv4() }; // Assign a unique ID
    machines.push(newMachine);
    saveMachines(machines);
    res.status(201).json({ message: 'New machine added successfully', machine: newMachine });
});

/**
 * @swagger
 * /machines/{id}:
 *   put:
 *     summary: Update an existing machine
 *     tags: [Machines]
 *     description: Update the details of an existing machine.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The machine ID.
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
 *               description:
 *                 type: string
 *               OEE:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Machine updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 machine:
 *                   type: object
 *       404:
 *         description: Machine not found.
 */
router.put('/:id', (req, res) => {
    const machines = loadMachines(); // Load all machines
    const id = req.params.id; // Extract the unique ID from the URL
    console.log(`[DEBUG] Incoming ID for update: ${id}`);

    // Locate the machine by its unique ID
    const index = machines.findIndex((m) => m.ID === id);
    console.log(`[DEBUG] Index found: ${index}`);

    if (index !== -1) {
        // Merge existing machine data with updates from the request body
        machines[index] = { ...machines[index], ...req.body };

        saveMachines(machines); // Save the updated list
        console.log(`[DEBUG] Updated machine data:`, machines[index]);

        res.status(200).json({
            message: 'Machine updated successfully',
            machine: machines[index],
        });
    } else {
        console.error(`[ERROR] Machine with ID ${id} not found`);
        res.status(404).json({ message: `Machine with ID ${id} not found` });
    }
});

/**
 * @swagger
 * /machines/{id}:
 *   delete:
 *     summary: Delete a machine
 *     tags: [Machines]
 *     description: Remove a machine from the list.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The machine ID.
 *     responses:
 *       200:
 *         description: Machine deleted successfully.
 *       404:
 *         description: Machine not found.
 */
router.delete('/:id', (req, res) => {
    let machines = loadMachines();
    const initialLength = machines.length;
    machines = machines.filter((m) => m.machine_id !== req.params.id);
    if (machines.length !== initialLength) {
        saveMachines(machines);
        res.status(200).json({ message: 'Machine deleted successfully' });
    } else {
        res.status(404).json({ message: `Machine with ID ${req.params.id} not found` });
    }
});

module.exports = router;

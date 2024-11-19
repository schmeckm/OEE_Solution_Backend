const express = require('express');
const { loadMachines, saveMachines } = require('../services/machineService');

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
    res.json(machines); // Return the list of machines as a JSON response
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
    const machines = loadMachines(); // Load all machines from the service
    const machine = machines.find(m => m.machine_id === req.params.id); // Find the machine by ID
    if (machine) {
        res.json(machine); // Return the machine as a JSON response
    } else {
        res.status(404).json({ message: `Machine with ID ${req.params.id} not found` }); // Send a 404 response if not found
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
    const machines = loadMachines(); // Load existing machines
    const newMachine = req.body; // Get the new machine data from the request body
    newMachine.machine_id = (machines.length ? Math.max(...machines.map(m => parseInt(m.machine_id))) + 1 : 1).toString(); // Generate a new machine ID
    machines.push(newMachine); // Add the new machine to the list
    saveMachines(machines); // Save the updated list of machines
    res.status(201).json({ message: 'New machine added successfully', machine: newMachine }); // Send a success response
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
    const machines = loadMachines(); // Load all machines from the service
    const index = machines.findIndex(m => m.machine_id === req.params.id); // Find the index of the machine to update
    if (index !== -1) {
        machines[index] = {...machines[index], ...req.body }; // Update the machine with the new data
        saveMachines(machines); // Save the updated list of machines
        res.status(200).json({ message: 'Machine updated successfully', machine: machines[index] }); // Send a success response
    } else {
        res.status(404).json({ message: `Machine with ID ${req.params.id} not found` }); // Send a 404 response if not found
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
    let machines = loadMachines(); // Load all machines from the service
    const initialLength = machines.length; // Store the initial length of the machine list
    machines = machines.filter(m => m.machine_id !== req.params.id); // Filter out the machine to delete
    if (machines.length !== initialLength) {
        saveMachines(machines); // Save the updated list of machines
        res.status(200).json({ message: 'Machine deleted successfully' }); // Send a success response
    } else {
        res.status(404).json({ message: `Machine with ID ${req.params.id} not found` }); // Send a 404 response if not found
    }
});

module.exports = router; // Export the router for use in other parts of the application
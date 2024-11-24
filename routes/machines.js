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
 *                 properties:
 *                   ID:
 *                     type: string
 *                     description: Unique identifier for the machine.
 *                   Plant:
 *                     type: string
 *                     description: The plant location.
 *                   area:
 *                     type: string
 *                     description: The area within the plant.
 *                   machineGroup:
 *                     type: string
 *                     description: The machine group.
 *                   name:
 *                     type: string
 *                     description: The name of the machine.
 *                   description:
 *                     type: string
 *                     description: A description of the machine.
 *                   OEE:
 *                     type: boolean
 *                     description: Whether OEE is enabled for the machine.
 */
router.get('/', (req, res) => {
    const machines = loadMachines();
    res.json(machines);
});

/**
 * @swagger
 * /machines/{id}:
 *   get:
 *     summary: Get a specific machine
 *     tags: [Machines]
 *     description: Retrieve a single machine by its unique ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the machine.
 *     responses:
 *       200:
 *         description: A machine object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ID:
 *                   type: string
 *                   description: Unique identifier for the machine.
 *                 Plant:
 *                   type: string
 *                   description: The plant location.
 *                 area:
 *                   type: string
 *                   description: The area within the plant.
 *                 machineGroup:
 *                   type: string
 *                   description: The machine group.
 *                 name:
 *                   type: string
 *                   description: The name of the machine.
 *                 description:
 *                   type: string
 *                   description: A description of the machine.
 *                 OEE:
 *                   type: boolean
 *                   description: Whether OEE is enabled for the machine.
 *       404:
 *         description: Machine not found.
 */
router.get('/:id', (req, res) => {
    const machines = loadMachines();
    const machine = machines.find((m) => m.ID === req.params.id);
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
 *     description: Create a new machine with the provided details.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Plant:
 *                 type: string
 *                 description: The plant location.
 *               area:
 *                 type: string
 *                 description: The area within the plant.
 *               machineGroup:
 *                 type: string
 *                 description: The machine group.
 *               name:
 *                 type: string
 *                 description: The name of the machine.
 *               description:
 *                 type: string
 *                 description: A description of the machine.
 *               OEE:
 *                 type: boolean
 *                 description: Whether OEE is enabled for the machine.
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
 *                   $ref: '#/components/schemas/Machine'
 */
router.post('/', (req, res) => {
    const machines = loadMachines();
    const newMachine = { ...req.body, ID: uuidv4() }; // Assign unique ID
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
 *     description: Update the details of an existing machine by its unique ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the machine.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Plant:
 *                 type: string
 *               area:
 *                 type: string
 *               machineGroup:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               OEE:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Machine updated successfully.
 *       404:
 *         description: Machine not found.
 */
router.put('/:id', (req, res) => {
    const machines = loadMachines();
    const id = req.params.id;
    const index = machines.findIndex((m) => m.ID === id);

    if (index !== -1) {
        machines[index] = { ...machines[index], ...req.body };
        saveMachines(machines);
        res.status(200).json({ message: 'Machine updated successfully', machine: machines[index] });
    } else {
        res.status(404).json({ message: `Machine with ID ${id} not found` });
    }
});

/**
 * @swagger
 * /machines/{id}:
 *   delete:
 *     summary: Delete a machine
 *     tags: [Machines]
 *     description: Remove a machine from the list by its unique ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the machine.
 *     responses:
 *       200:
 *         description: Machine deleted successfully.
 *       404:
 *         description: Machine not found.
 */
router.delete('/:id', (req, res) => {
    const machines = loadMachines();
    const filteredMachines = machines.filter((m) => m.ID !== req.params.id);

    if (filteredMachines.length < machines.length) {
        saveMachines(filteredMachines);
        res.status(200).json({ message: 'Machine deleted successfully' });
    } else {
        res.status(404).json({ message: `Machine with ID ${req.params.id} not found` });
    }
});

module.exports = router;

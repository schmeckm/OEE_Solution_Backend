const express = require('express');
const {
    loadPlannedDowntime,
    savePlannedDowntime,
    getPlannedDowntimeByProcessOrderNumber,
    getPlannedDowntimeByMachineId
} = require('../services/plannedDowntimeService');
const moment = require('moment'); // Moment.js für die Datumsmanipulation

const router = express.Router();

// Utility function to calculate duration in minutes
function calculateDurationInMinutes(start, end) {
    const startTime = moment(start);
    const endTime = moment(end);
    return endTime.diff(startTime, 'minutes');
}

/**
 * @swagger
 * /planneddowntime:
 *   get:
 *     summary: Get all planned downtimes
 *     tags: [Planned Downtime]
 *     description: Retrieve a list of all planned downtimes.
 *     responses:
 *       200:
 *         description: A list of planned downtimes.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/', (req, res) => {
    let data = loadPlannedDowntime();

    // Calculate the duration in minutes for each downtime entry
    data = data.map(downtime => ({
        ...downtime,
        durationInMinutes: calculateDurationInMinutes(downtime.Start, downtime.End)
    }));

    res.json(data);
});

/**
 * @swagger
 * /planneddowntime/processorder/{processOrderNumber}:
 *   get:
 *     summary: Get planned downtime by Process Order Number
 *     tags: [Planned Downtime]
 *     description: Retrieve planned downtimes for a specific process order.
 *     parameters:
 *       - in: path
 *         name: processOrderNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: The process order number to filter by.
 *     responses:
 *       200:
 *         description: A list of planned downtimes for the specified process order.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       404:
 *         description: No planned downtime found for the specified process order number.
 */
router.get('/processorder/:processOrderNumber', async(req, res) => {
    const processOrderNumber = req.params.processOrderNumber;
    let data = await getPlannedDowntimeByProcessOrderNumber(processOrderNumber);

    if (data.length > 0) {
        data = data.map(downtime => ({
            ...downtime,
            durationInMinutes: calculateDurationInMinutes(downtime.Start, downtime.End)
        }));
        res.json(data);
    } else {
        res.status(404).json({ message: 'No planned downtime found for the specified process order number' });
    }
});

/**
 * @swagger
 * /planneddowntime/machine/{machineId}:
 *   get:
 *     summary: Get planned downtime by Machine ID
 *     tags: [Planned Downtime]
 *     description: Retrieve planned downtimes for a specific machine.
 *     parameters:
 *       - in: path
 *         name: machineId
 *         required: true
 *         schema:
 *           type: string
 *         description: The machine ID to filter by.
 *     responses:
 *       200:
 *         description: A list of planned downtimes for the specified machine ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       404:
 *         description: No planned downtime found for the specified machine ID.
 */
router.get('/machine/:machineId', async(req, res) => {
    const machineId = req.params.machineId;
    let data = await getPlannedDowntimeByMachineId(machineId);

    if (data.length > 0) {
        data = data.map(downtime => ({
            ...downtime,
            durationInMinutes: calculateDurationInMinutes(downtime.Start, downtime.End)
        }));
        res.json(data);
    } else {
        res.status(404).json({ message: 'No planned downtime found for the specified machine ID' });
    }
});

/**
 * @swagger
 * /planneddowntime/{id}:
 *   get:
 *     summary: Get a specific planned downtime
 *     tags: [Planned Downtime]
 *     description: Retrieve a single planned downtime by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The planned downtime ID.
 *     responses:
 *       200:
 *         description: A specific planned downtime object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Planned downtime not found.
 */
router.get('/:id', (req, res) => {
    let data = loadPlannedDowntime();
    const id = req.params.id;
    const downtime = data.find(d => d.ID === id);
    if (downtime) {
        const downtimeWithDuration = {
            ...downtime,
            durationInMinutes: calculateDurationInMinutes(downtime.Start, downtime.End)
        };
        res.json(downtimeWithDuration);
    } else {
        res.status(404).json({ message: 'Planned downtime not found' });
    }
});

/**
 * @swagger
 * /planneddowntime:
 *   post:
 *     summary: Add a new planned downtime
 *     tags: [Planned Downtime]
 *     description: Create a new planned downtime.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ID:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Planned downtime added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post('/', (req, res) => {
    const data = loadPlannedDowntime();
    const newData = req.body;
    data.push(newData);
    savePlannedDowntime(data);
    res.status(201).json({ message: 'Planned downtime added successfully' });
});

/**
 * @swagger
 * /planneddowntime/{id}:
 *   put:
 *     summary: Update an existing planned downtime
 *     tags: [Planned Downtime]
 *     description: Update the details of an existing planned downtime.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The planned downtime ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Planned downtime updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Planned downtime not found.
 */
router.put('/:id', (req, res) => {
    const data = loadPlannedDowntime();
    const id = req.params.id;
    const updatedData = req.body;
    const index = data.findIndex(item => item.ID === id);
    if (index !== -1) {
        data[index] = updatedData;
        savePlannedDowntime(data);
        res.status(200).json({ message: 'Planned downtime updated successfully' });
    } else {
        res.status(404).json({ message: 'Planned downtime not found' });
    }
});

/**
 * @swagger
 * /planneddowntime/{id}:
 *   delete:
 *     summary: Delete a planned downtime
 *     tags: [Planned Downtime]
 *     description: Remove a planned downtime from the list.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The planned downtime ID.
 *     responses:
 *       200:
 *         description: Planned downtime deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Planned downtime not found.
 */
router.delete('/:id', (req, res) => {
    let data = loadPlannedDowntime();
    const initialLength = data.length;
    data = data.filter(item => item.ID !== req.params.id);
    if (data.length !== initialLength) {
        savePlannedDowntime(data);
        res.status(200).json({ message: 'Planned downtime deleted successfully' });
    } else {
        res.status(404).json({ message: 'Planned downtime not found' });
    }
});

module.exports = router;
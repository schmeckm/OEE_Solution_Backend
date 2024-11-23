const express = require('express');
const {
    loadPlannedDowntime,
    savePlannedDowntime,
    getPlannedDowntimeByProcessOrderNumber,
    getPlannedDowntimeByMachineId
} = require('../services/plannedDowntimeService');
const moment = require('moment');
const { check, validationResult } = require('express-validator');

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
router.get('/', async (req, res) => {
    try {
        let data = await loadPlannedDowntime();
        data = data.map(downtime => ({
            ...downtime,
            durationInMinutes: calculateDurationInMinutes(downtime.Start, downtime.End),
        }));
        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching planned downtimes:', error);
        res.status(500).json({ message: 'An error occurred while retrieving planned downtimes' });
    }
});

/**
 * @swagger
 * /planneddowntime/processorder/{processOrderNumber}:
 *   get:
 *     summary: Get planned downtime by Process Order Number
 *     tags: [Planned Downtime]
 *     parameters:
 *       - in: path
 *         name: processOrderNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of planned downtimes.
 */
router.get('/processorder/:processOrderNumber', async (req, res) => {
    try {
        const processOrderNumber = req.params.processOrderNumber;
        let data = await getPlannedDowntimeByProcessOrderNumber(processOrderNumber);

        if (data.length > 0) {
            data = data.map(downtime => ({
                ...downtime,
                durationInMinutes: calculateDurationInMinutes(downtime.Start, downtime.End),
            }));
            res.status(200).json(data);
        } else {
            res.status(404).json({ message: 'No planned downtime found for the specified process order number' });
        }
    } catch (error) {
        console.error('Error fetching planned downtimes:', error);
        res.status(500).json({ message: 'An error occurred while retrieving planned downtimes' });
    }
});

/**
 * @swagger
 * /planneddowntime/{id}:
 *   put:
 *     summary: Replace planned downtime by ID
 *     tags: [Planned Downtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Planned downtime updated successfully.
 */
router.put('/:order_id', async (req, res) => {
    try {
        const orderId = parseInt(req.params.order_id); // order_id aus URL
        const newData = req.body; // Neuer vollständiger Datensatz

        // Daten laden
        let data = await loadPlannedDowntime();

        // Eintrag mit passender order_id finden
        const index = data.findIndex(item => item.order_id === orderId);

        if (index !== -1) {
            // Dauer automatisch berechnen, falls Start und End vorhanden sind
            if (newData.Start && newData.End) {
                newData.durationInMinutes = calculateDurationInMinutes(newData.Start, newData.End);
            }

            // Eintrag ersetzen
            data[index] = { ...newData, order_id: orderId }; // order_id bleibt gleich

            // Daten speichern
            await savePlannedDowntime(data);

            res.status(200).json({
                message: 'Planned downtime updated successfully',
                updatedData: data[index],
            });
        } else {
            res.status(404).json({ message: 'Planned downtime not found' });
        }
    } catch (error) {
        console.error('Error updating planned downtime:', error);
        res.status(500).json({ message: 'An error occurred while updating planned downtime' });
    }
});


/**
 * @swagger
 * /planneddowntime/{id}:
 *   delete:
 *     summary: Delete a planned downtime by ID
 *     tags: [Planned Downtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Planned downtime deleted successfully.
 */
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        let data = await loadPlannedDowntime();
        const initialLength = data.length;
        data = data.filter(item => item.ID !== id);

        if (data.length !== initialLength) {
            await savePlannedDowntime(data);
            res.status(200).json({ message: 'Planned downtime deleted successfully' });
        } else {
            res.status(404).json({ message: 'Planned downtime not found' });
        }
    } catch (error) {
        console.error('Error deleting planned downtime:', error);
        res.status(500).json({ message: 'An error occurred while deleting planned downtime' });
    }
});

module.exports = router;

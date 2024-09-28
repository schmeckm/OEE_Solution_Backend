const express = require('express');
const { getOEEMetrics } = require('../src/oeeProcessor'); // Funktion zum Lesen der Buffer-Daten
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Realtime OEE by Line
 *   description: API for reading OEE from Line
 */

/**
 * @swagger
 * /oee/{machineId}:
 *   get:
 *     tags: 
 *       - Realtime OEE by Line
 *     summary: Get current OEE metrics for a machine
 *     description: Retrieve the current OEE metrics from the buffer for the specified machine.
 *     parameters:
 *       - in: path
 *         name: machineId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the machine.
 *     responses:
 *       200:
 *         description: A JSON object containing the OEE metrics.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 oee:
 *                   type: number
 *                   description: The calculated OEE value
 *       404:
 *         description: Machine OEE data not found.
 */

router.get('/oee/:machineId', async(req, res) => {
    const { machineId } = req.params;

    try {
        const metrics = await getOEEMetrics(machineId); // Rufe die OEE-Daten ab

        if (metrics) {
            res.json(metrics); // Rückgabe der OEE-Daten
        } else {
            res.status(404).json({ error: 'Machine OEE data not found.' });
        }
    } catch (error) {
        console.error(`Fehler beim Abrufen der OEE-Daten für Maschine ${machineId}:`, error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
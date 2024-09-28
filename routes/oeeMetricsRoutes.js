const express = require('express');
const { writeOEEToInfluxDB } = require('../services/oeeMetricsService');
const router = express.Router();

/**
 * @swagger
 * /write-oee-metrics:
 *   post:
 *     summary: Writes OEE (Overall Equipment Effectiveness) metrics to InfluxDB.
 *     description: This endpoint accepts OEE metric data and writes it to InfluxDB using the OEE Metrics Service.
 *     tags:
 *       - OEE Metrics
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - processData
 *               - oee
 *               - availability
 *               - performance
 *               - quality
 *             properties:
 *               processData:
 *                 type: object
 *                 properties:
 *                   plant:
 *                     type: string
 *                     description: Name of the plant.
 *                   area:
 *                     type: string
 *                     description: Area within the plant.
 *                   machineId:
 *                     type: string
 *                     description: Identifier for the machine.
 *                   ProcessOrderNumber:
 *                     type: string
 *                     description: Process order number.
 *                   MaterialNumber:
 *                     type: string
 *                     description: Material number.
 *                   MaterialDescription:
 *                     type: string
 *                     description: Description of the material.
 *                   plannedProductionQuantity:
 *                     type: number
 *                     description: Planned production quantity.
 *                   plannedDowntime:
 *                     type: number
 *                     description: Planned downtime in minutes.
 *                   unplannedDowntime:
 *                     type: number
 *                     description: Unplanned downtime in minutes.
 *                   microstops:
 *                     type: number
 *                     description: Number of microstops.
 *               oee:
 *                 type: number
 *                 description: Overall Equipment Effectiveness percentage.
 *               availability:
 *                 type: number
 *                 description: Availability component of OEE.
 *               performance:
 *                 type: number
 *                 description: Performance component of OEE.
 *               quality:
 *                 type: number
 *                 description: Quality component of OEE.
 *     responses:
 *       200:
 *         description: Successfully written the OEE metrics to InfluxDB.
 *       500:
 *         description: Failed to write metrics due to an internal server error.
 */
router.post('/write-oee-metrics', async(req, res) => {
    try {
        await writeOEEToInfluxDB(req.body);
        res.status(200).json({ message: 'Metrics written successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to write metrics', error: error.message });
    }
});

module.exports = router;
const express = require('express');
const { writeOEEToInfluxDB, readOEEFromInfluxDB } = require('../services/oeeMetricsService');
const { body, query, validationResult } = require('express-validator');
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
router.post('/write-oee-metrics', [
        body('processData').isObject(),
        body('oee').isFloat({ min: 0, max: 100 }),
        body('availability').isFloat({ min: 0, max: 100 }),
        body('performance').isFloat({ min: 0, max: 100 }),
        body('quality').isFloat({ min: 0, max: 100 }),
    ],
    async(req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            await writeOEEToInfluxDB(req.body);
            res.status(200).json({ message: 'Metrics written successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Failed to write metrics', error: error.message });
        }
    }
);
/**
 * @swagger
 * /oee-metrics/read-oee-metrics:
 *   get:
 *     summary: Reads OEE (Overall Equipment Effectiveness) metrics from InfluxDB.
 *     description: This endpoint retrieves OEE metric data from InfluxDB based on optional filters such as plant, area, machine ID, and process order.
 *     tags:
 *       - OEE Metrics
 *     parameters:
 *       - in: query
 *         name: plant
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by plant.
 *       - in: query
 *         name: area
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by area.
 *       - in: query
 *         name: machineId
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by machine ID.
 *       - in: query
 *         name: processOrder
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by process order number.
 *     responses:
 *       200:
 *         description: Successfully retrieved the OEE metrics from InfluxDB.
 *       404:
 *         description: No metrics found.
 *       500:
 *         description: Failed to retrieve metrics due to an internal server error.
 */
router.get('/read-oee-metrics', [
        query('plant').optional().isString(),
        query('area').optional().isString(),
        query('machineId').optional().isString(),
        query('processOrder').optional().isString(),
    ],
    async(req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const filters = {
                plant: req.query.plant,
                area: req.query.area,
                machineId: req.query.machineId,
                processOrder: req.query.processOrder,
            };

            const data = await readOEEFromInfluxDB(filters);

            if (data.length > 0) {
                res.status(200).json(data);
            } else {
                res.status(404).json({ message: 'No metrics found' });
            }
        } catch (error) {
            res.status(500).json({ message: 'Failed to retrieve metrics', error: error.message });
        }
    }
);

module.exports = router;
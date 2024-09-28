const express = require('express');
const moment = require('moment'); // Make sure this is present
const { aggregateMicrostopsByProcessOrder } = require('../services/microstopAggregationByProcessOrder');

const router = express.Router();
/**
 * @swagger
 * tags:
 *   name: Microstop Aggregation
 *   description: API for aggregating microstops data
 */

/**
 * @swagger
 * /microstop-aggregation/process-order:
 *   get:
 *     summary: Get aggregated microstops by process order
 *     description: Retrieve microstops aggregated by reason code for a given process order number, or filter by start and end date.
 *     tags: [Microstop Aggregation]
 *     parameters:
 *       - in: query
 *         name: processOrderNumber
 *         schema:
 *           type: string
 *         description: "The process order number to filter by."
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: "Start date to filter microstops (format: YYYY-MM-DDTHH:mm:ssZ)."
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: "End date to filter microstops (format: YYYY-MM-DDTHH:mm:ssZ)."
 *     responses:
 *       200:
 *         description: A list of aggregated microstops.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: integer
 *       404:
 *         description: Microstop not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.get('/', async(req, res) => {
    const { processOrderNumber, startDate, endDate } = req.query;

    try {
        const aggregatedData = await aggregateMicrostopsByProcessOrder(
            processOrderNumber,
            startDate ? moment(startDate).toDate() : null,
            endDate ? moment(endDate).toDate() : null
        );

        if (Object.keys(aggregatedData).length === 0) {
            return res.status(404).json({ message: 'Microstop not found' });
        }

        res.json(aggregatedData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
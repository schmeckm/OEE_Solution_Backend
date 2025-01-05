const express = require("express");
const Joi = require("joi");
const sanitizeHtml = require("sanitize-html");
const { aggregateMicrostopsByProcessOrder } = require("../services/microstopAggregationByProcessOrder");
const router = express.Router();

/**
 * Validates and sanitizes query parameters.
 */
const validateAndSanitizeQuery = (query) => {
  // Joi schema for query parameters
  const schema = Joi.object({
    processOrderNumber: Joi.string().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
  }).or('processOrderNumber', 'startDate'); // Require at least one of these

  // Validate input data
  const { error, value } = schema.validate(query);

  if (error) {
    throw new Error(`Invalid query parameters: ${error.details[0].message}`);
  }

  // Sanitize string inputs
  if (value.processOrderNumber) {
    value.processOrderNumber = sanitizeHtml(value.processOrderNumber);
  }

  return value;
};


/**
 * @swagger
 * tags:
 *   name: Microstop Aggregation
 *   description: API for aggregating microstop data
 *
 * /microstop-aggregation/process-order:
 *   get:
 *     summary: Get aggregated microstops by process order
 *     description: Retrieve microstops aggregated by reason code for a given process order number.
 *     tags: [Microstop Aggregation]
 *     parameters:
 *       - in: query
 *         name: processOrderNumber
 *         schema:
 *           type: string
 *         description: The process order number to filter by.
 *     responses:
 *       200:
 *         description: A list of aggregated microstops.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: integer
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Microstops not found
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



/**
 * API to fetch aggregated microstops by process order.
 */
router.get(
    "/",
    async (req, res) => {
        try {
            const { processOrderNumber } = validateAndSanitizeQuery(req.query);

            // Call the service function
            const aggregatedData = await aggregateMicrostopsByProcessOrder(processOrderNumber);

            res.json(aggregatedData);
        } catch (error) {
            if (error.message.startsWith("Invalid query parameters")) {
                res.status(400).json({ message: error.message });
            } else if (error.message.includes("not found")) {
                res.status(404).json({ message: error.message });
            } else {
                console.error("[ERROR]", error);
                res.status(500).json({ message: "Internal server error" });
            }
        }
    }
);

module.exports = router;




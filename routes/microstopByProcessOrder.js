const express = require('express');
const moment = require('moment-timezone'); // Ensure moment-timezone is used for consistency
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

const { aggregateMicrostopsByProcessOrder } = require('../services/microstopAggregationByProcessOrder');

const router = express.Router();

// Centralized error handling middleware
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Input validation and sanitization function
const validateAndSanitizeQuery = (query) => {
  // Joi schema for query parameters
  const schema = Joi.object({
    processOrderNumber: Joi.string().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
  }).or('processOrderNumber', 'startDate'); // At least one must be provided

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
 *   description: API for aggregating microstops data
 */

/**
 * @swagger
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
router.get(
  '/',
  asyncHandler(async (req, res) => {
    try {
      // Validate and sanitize query parameters
      const { processOrderNumber} = validateAndSanitizeQuery(req.query);

      // Call the service function
      const aggregatedData = await aggregateMicrostopsByProcessOrder(
        processOrderNumber
      );

      if (!aggregatedData || Object.keys(aggregatedData).length === 0) {
        return res.status(404).json({ message: 'No microstops found' });
      }

      res.json(aggregatedData);
    } catch (error) {
      if (error.message.startsWith('Invalid query parameters')) {
        res.status(400).json({ message: error.message });
      } else {
        console.error('[ERROR]', error);
        res.status(500).json({ message: 'Server error' });
      }
    }
  })
);

module.exports = router;

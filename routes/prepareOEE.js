const express = require("express");
const { loadDataAndPrepareOEE } = require("../services/prepareOEEServices");

const Joi = require("joi");
const sanitizeHtml = require("sanitize-html");

const router = express.Router();

// Centralized error handling middleware
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Input validation and sanitization function
/**
 * Validates and sanitizes a machine ID.
 *
 * This function uses Joi to validate that the provided machine ID is a valid UUID.
 * If the validation fails, an error is thrown. If the validation succeeds, the
 * machine ID is sanitized using sanitizeHtml.
 *
 * @param {string} machineId - The machine ID to validate and sanitize.
 * @returns {string} - The sanitized machine ID.
 * @throws {Error} - Throws an error if the machine ID is invalid.
 */
const validateAndSanitizeMachineId = (machineId) => {
  // Joi schema for machineId (assuming it's a UUID)
  const schema = Joi.string().uuid().required();

  // Validate input data
  const { error, value } = schema.validate(machineId);

  if (error) {
    throw new Error("Invalid machine ID format.");
  }

  // Sanitize machineId
  const sanitizedMachineId = sanitizeHtml(value);

  return sanitizedMachineId;
};

/**
 * @swagger
 * tags:
 *   name: OEE Preparation
 *   description: API for loading data and preparing OEE calculations
 */

/**
 * @swagger
 * /oee/{machineId}:
 *   get:
 *     summary: Load data and prepare OEE calculations
 *     tags: [OEE Preparation]
 *     description: Retrieves OEE data for a specific machine by its ID and prepares the calculations.
 *     parameters:
 *       - in: path
 *         name: machineId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the machine to retrieve OEE data for.
 *     responses:
 *       200:
 *         description: Successfully retrieved and prepared OEE data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Invalid machine ID format.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: An error occurred while processing the OEE data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.get(
  "/oee/:machineId",
  asyncHandler(async (req, res) => {
    try {
      // Validate and sanitize machineId
      const machineId = validateAndSanitizeMachineId(req.params.machineId);

      // Load and prepare OEE data
      const oeeData = await loadDataAndPrepareOEE(machineId);
      res.json(oeeData);
    } catch (error) {
      if (error.message === "Invalid machine ID format.") {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error processing OEE data." });
      }
    }
  })
);

module.exports = router;

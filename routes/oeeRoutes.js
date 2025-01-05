const express = require("express");
const Joi = require("joi");
const { getOEEMetrics } = require("../src/oeeProcessor");
const router = express.Router();

// Centralized error handling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Validates a machine ID.
 *
 * @param {string} machineId - The machine ID to validate.
 * @returns {string} - The validated machine ID.
 * @throws {Error} - If validation fails.
 */
const validateMachineId = (machineId) => {
  const schema = Joi.string()
    .guid({ version: ["uuidv4"] })
    .required(); // Enforce UUID v4 format

  const { error, value } = schema.validate(machineId);

  if (error) {
    throw new Error(`Ungültige Maschinen-ID: ${error.details[0].message}`);
  }

  return value;
};

/**
 * @swagger
 * tags:
 *   name: Realtime OEE by Line
 *   description: API for retrieving OEE metrics for a machine
 */

/**
 * @swagger
 * /oee/{machineId}:
 *   get:
 *     tags:
 *       - Realtime OEE by Line
 *     summary: Retrieve current OEE metrics for a machine
 *     description: Fetch the current OEE metrics from the buffer for the given machine.
 *     parameters:
 *       - in: path
 *         name: machineId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique ID of the machine.
 *     responses:
 *       200:
 *         description: JSON object containing OEE metrics.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 oee:
 *                   type: number
 *                   description: Calculated OEE value.
 *       400:
 *         description: Invalid machine ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: OEE metrics not found for the machine.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.get(
  "/:machineId",
  asyncHandler(async (req, res) => {
    try {
      const machineId = validateMachineId(req.params.machineId); // Validate machine ID

      const metrics = await getOEEMetrics(machineId); // Fetch OEE metrics

      if (metrics) {
        res.json(metrics); // Return OEE metrics
      } else {
        res
          .status(404)
          .json({ message: "OEE-Daten der Maschine nicht gefunden." });
      }
    } catch (error) {
      if (error.message.startsWith("Ungültige Maschinen-ID")) {
        res.status(400).json({ message: error.message });
      } else {
        console.error(
          `Fehler beim Abrufen der OEE-Daten für Maschine ${req.params.machineId}:`,
          error
        );
        res.status(500).json({ message: "Interner Serverfehler" });
      }
    }
  })
);

module.exports = router;

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");
const Joi = require("joi");
const sanitizeHtml = require("sanitize-html");

const {
  loadMicroStops,
  saveMicroStops,
} = require("../services/microstopService");

const router = express.Router();

// Centralized error handling middleware
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Input validation and sanitization function
const validateAndSanitizeMicroStop = (data) => {
  // Joi schema for microstops
  const schema = Joi.object({
    description: Joi.string().required(),
    Start: Joi.date().required(),
    End: Joi.date().required(),
    machine_id: Joi.string().required(),
    // Add any other required fields here
  });

  // Validate input data
  const { error, value } = schema.validate(data);

  if (error) {
    throw new Error(error.details[0].message);
  }

  // Sanitize string inputs
  value.description = sanitizeHtml(value.description);
  value.machine_id = sanitizeHtml(value.machine_id);

  return value;
};

// Utility function for consistent date formatting
const formatDate = (date) =>
  date ? moment(date).format("YYYY-MM-DDTHH:mm:ss") : null;

/**
 * @swagger
 * tags:
 *   name: Microstops
 *   description: API for managing microstops
 */

/**
 * @swagger
 * /microstops:
 *   get:
 *     summary: Get all microstops
 *     tags: [Microstops]
 *     description: Retrieve a list of all microstops.
 *     responses:
 *       200:
 *         description: A list of microstops.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MicroStop'
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await loadMicroStops();
    res.json(data);
  })
);

/**
 * @swagger
 * /microstops/{id}:
 *   get:
 *     summary: Get a specific microstop
 *     tags: [Microstops]
 *     description: Retrieve a single microstop by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The microstop ID.
 *     responses:
 *       200:
 *         description: A microstop object.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MicroStop'
 *       404:
 *         description: Microstop not found.
 */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = await loadMicroStops();
    const microStop = data.find((d) => d.ID === req.params.id);
    if (microStop) {
      res.json(microStop);
    } else {
      res.status(404).json({ message: "Microstop not found" });
    }
  })
);

/**
 * @swagger
 * /microstops:
 *   post:
 *     summary: Add a new microstop
 *     tags: [Microstops]
 *     description: Create a new microstop.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MicroStopInput'
 *     responses:
 *       201:
 *         description: Microstop added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MicroStop'
 *       400:
 *         description: Invalid input data.
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const data = await loadMicroStops();
      const sanitizedData = validateAndSanitizeMicroStop(req.body);

      // Generate a new unique ID
      sanitizedData.ID = uuidv4();

      // Format date fields
      sanitizedData.Start = formatDate(sanitizedData.Start);
      sanitizedData.End = formatDate(sanitizedData.End);

      data.push(sanitizedData);
      await saveMicroStops(data);
      res.status(201).json(sanitizedData);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  })
);

/**
 * @swagger
 * /microstops/{id}:
 *   put:
 *     summary: Update an existing microstop
 *     tags: [Microstops]
 *     description: Update the details of an existing microstop.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The microstop ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MicroStopInput'
 *     responses:
 *       200:
 *         description: Microstop updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MicroStop'
 *       400:
 *         description: Invalid input data.
 *       404:
 *         description: Microstop not found.
 */
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const data = await loadMicroStops();
      const index = data.findIndex((item) => item.ID === req.params.id);

      if (index !== -1) {
        const sanitizedData = validateAndSanitizeMicroStop(req.body);

        // Preserve the original ID
        sanitizedData.ID = req.params.id;

        // Format date fields
        sanitizedData.Start = formatDate(sanitizedData.Start);
        sanitizedData.End = formatDate(sanitizedData.End);

        data[index] = { ...data[index], ...sanitizedData };
        await saveMicroStops(data);
        res.status(200).json(data[index]);
      } else {
        res.status(404).json({ message: "Microstop not found" });
      }
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  })
);

/**
 * @swagger
 * /microstops/{id}:
 *   delete:
 *     summary: Delete a microstop
 *     tags: [Microstops]
 *     description: Remove a microstop from the list.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The microstop ID.
 *     responses:
 *       204:
 *         description: Microstop deleted successfully.
 *       404:
 *         description: Microstop not found.
 */
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = await loadMicroStops();
    const initialLength = data.length;
    const newData = data.filter((item) => item.ID !== req.params.id);

    if (newData.length !== initialLength) {
      await saveMicroStops(newData);
      res.status(204).send();
    } else {
      res.status(404).json({ message: "Microstop not found" });
    }
  })
);

module.exports = router;

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");

const { loadPlannedDowntime, loadPlannedDowntimeById, createPlannedDowntime, updatePlannedDowntime, deletePlannedDowntime } = require("../services/plannedDowntimeService");

const router = express.Router();

// Fehlerbehandlung
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Utility-Funktion zur Berechnung der Dauer in Minuten
const calculateDurationInMinutes = (start, end) => {
  const startTime = moment(start);
  const endTime = moment(end);
  return endTime.diff(startTime, "minutes");
};

// Utility-Funktion zur Datumsformatierung
const formatDate = (date) =>
  date ? moment(date).format("YYYY-MM-DDTHH:mm:ss") : null;

/**
 * @swagger
 * tags:
 *   name: Planned Downtime
 *   description: API zur Verwaltung geplanter Stillstandszeiten
 */

/**
 * @swagger
 * /plannedDowntime:
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
 *                 $ref: '#/components/schemas/PlannedDowntime'
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await loadPlannedDowntime();
    res.json(data);
  })
);

/**
 * @swagger
 * /plannedDowntime/{id}:
 *   get:
 *     summary: Get a planned downtime by ID
 *     tags: [Planned Downtime]
 *     description: Retrieve a planned downtime by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The planned downtime UUID.
 *     responses:
 *       200:
 *         description: The planned downtime with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlannedDowntime'
 *       404:
 *         description: Planned downtime not found.
 */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const plannedDowntime = await loadPlannedDowntimeById(id);
    if (!plannedDowntime) {
      return res.status(404).json({ message: `Planned downtime with ID ${id} not found` });
    }
    res.json(plannedDowntime);
  })
);

/**
 * @swagger
 * /plannedDowntime:
 *   post:
 *     summary: Create a new planned downtime
 *     tags: [Planned Downtime]
 *     description: Create a new planned downtime.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PlannedDowntime'
 *     responses:
 *       201:
 *         description: Planned downtime created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlannedDowntime'
 *       500:
 *         description: Error creating planned downtime
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const newData = {
      ...req.body,
      plannedOrder_ID: uuidv4(),
      Start: formatDate(req.body.Start),
      End: formatDate(req.body.End),
    };

    const createdDowntime = await createPlannedDowntime(newData);
    res.status(201).json(createdDowntime);
  })
);

/**
 * @swagger
 * /plannedDowntime/{id}:
 *   put:
 *     summary: Update an existing planned downtime
 *     tags: [Planned Downtime]
 *     description: Update an existing planned downtime by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The planned downtime UUID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PlannedDowntime'
 *     responses:
 *       200:
 *         description: Planned downtime updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlannedDowntime'
 *       404:
 *         description: Planned downtime not found.
 *       500:
 *         description: Error updating planned downtime
 */
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updatedData = {
      ...req.body,
      Start: formatDate(req.body.Start),
      End: formatDate(req.body.End),
    };

    const updatedDowntime = await updatePlannedDowntime(id, updatedData);
    if (!updatedDowntime) {
      return res.status(404).json({ message: `Planned downtime with ID ${id} not found` });
    }
    res.json(updatedDowntime);
  })
);

/**
 * @swagger
 * /plannedDowntime/{id}:
 *   delete:
 *     summary: Delete a planned downtime
 *     tags: [Planned Downtime]
 *     description: Delete a planned downtime by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The planned downtime UUID.
 *     responses:
 *       204:
 *         description: Planned downtime deleted successfully.
 *       404:
 *         description: Planned downtime not found.
 *       500:
 *         description: Error deleting planned downtime
 */
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await deletePlannedDowntime(id);
    if (!result) {
      return res.status(404).json({ message: `Planned downtime with ID ${id} not found` });
    }
    res.status(204).send();
  })
);

module.exports = router;

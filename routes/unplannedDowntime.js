const express = require("express");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");

const { loadUnplannedDowntime, loadUnplannedDowntimeById, createUnplannedDowntime, updateUnplannedDowntime, deleteUnplannedDowntime } = require("../services/unplannedDowntimeService");

const router = express.Router();

// Fehlerbehandlung
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @swagger
 * components:
 *   schemas:
 *     UnplannedDowntime:
 *       type: object
 *       required:
 *         - id
 *         - Start
 *         - End
 *       properties:
 *         id:
 *           type: string
 *           description: Eindeutiger Identifikator der ungeplanten Stillstandszeit.
 *         Start:
 *           type: string
 *           format: date-time
 *           description: Startzeit der ungeplanten Stillstandszeit.
 *         End:
 *           type: string
 *           format: date-time
 *           description: Endzeit der ungeplanten Stillstandszeit.
 *         Description:
 *           type: string
 *           description: Beschreibung der ungeplanten Stillstandszeit.
 */

/**
 * @swagger
 * tags:
 *   name: Unplanned Downtime
 *   description: Management of unplanned downtimes.
 */

/**
 * @swagger
 * /unplannedDowntime:
 *   get:
 *     summary: Get all unplanned downtimes
 *     tags: [Unplanned Downtime]
 *     responses:
 *       200:
 *         description: A list of unplanned downtimes.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UnplannedDowntime'
 */
router.get("/", asyncHandler(async (req, res) => {
  const data = await loadUnplannedDowntime();
  res.json(data);
}));

/**
 * @swagger
 * /unplannedDowntime/{id}:
 *   get:
 *     summary: Get an unplanned downtime by ID
 *     tags: [Unplanned Downtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the unplanned downtime to retrieve.
 *     responses:
 *       200:
 *         description: The unplanned downtime with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnplannedDowntime'
 *       404:
 *         description: Unplanned downtime not found.
 */
router.get("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const unplannedDowntime = await loadUnplannedDowntimeById(id);
  if (!unplannedDowntime) {
    return res.status(404).json({ message: "Unplanned downtime not found" });
  }
  res.json(unplannedDowntime);
}));

/**
 * @swagger
 * /unplannedDowntime:
 *   post:
 *     summary: Create a new unplanned downtime
 *     tags: [Unplanned Downtime]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UnplannedDowntime'
 *     responses:
 *       201:
 *         description: Unplanned downtime created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnplannedDowntime'
 */
router.post("/", asyncHandler(async (req, res) => {
  const newData = {...req.body, id: uuidv4()};
  const createdDowntime = await createUnplannedDowntime(newData);
  res.status(201).json(createdDowntime);
}));

/**
 * @swagger
 * /unplannedDowntime/{id}:
 *   put:
 *     summary: Update an existing unplanned downtime
 *     tags: [Unplanned Downtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the unplanned downtime to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UnplannedDowntime'
 *     responses:
 *       200:
 *         description: Unplanned downtime updated successfully.
 *       404:
 *         description: Unplanned downtime not found.
 *       500:
 *         description: Error updating unplanned downtime.
 */
router.put("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedDowntime = await updateUnplannedDowntime(id, {...req.body});
  if (!updatedDowntime) {
    return res.status(404).json({ message: "Unplanned downtime not found" });
  }
  res.status(200).json(updatedDowntime);
}));

/**
 * @swagger
 * /unplannedDowntime/{id}:
 *   delete:
 *     summary: Delete an unplanned downtime
 *     tags: [Unplanned Downtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the unplanned downtime to delete.
 *     responses:
 *       204:
 *         description: Unplanned downtime deleted successfully.
 *       404:
 *         description: Unplanned downtime not found.
 */
router.delete("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await deleteUnplannedDowntime(id);
  if (!result) {
    return res.status(404).json({ message: "Unplanned downtime not found" });
  }
  res.status(204).send();
}));

module.exports = router;

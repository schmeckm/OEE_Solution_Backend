const express = require("express");
const router = express.Router();
const { loadPlannedDowntime, loadPlannedDowntimeById, createPlannedDowntime, updatePlannedDowntime, deletePlannedDowntime } = require("../services/plannedDowntimeService");
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @swagger
 * components:
 *   schemas:
 *     PlannedDowntime:
 *       type: object
 *       required:
 *         - id
 *         - plannedOrder_ID
 *         - Start
 *         - End
 *       properties:
 *         id:
 *           type: string
 *           description: The unique identifier for the planned downtime.
 *         plannedOrder_ID:
 *           type: string
 *           description: Identifier of the associated planned order.
 *         Start:
 *           type: string
 *           format: date-time
 *           description: Start time of the planned downtime.
 *         End:
 *           type: string
 *           format: date-time
 *           description: End time of the planned downtime.
 *         Description:
 *           type: string
 *           description: Description of the planned downtime.
 */

/**
 * @swagger
 * tags:
 *   name: Planned Downtime
 *   description: Management of planned downtimes.
 */

/**
 * @swagger
 * /plannedDowntime:
 *   get:
 *     summary: Get all planned downtimes
 *     tags: [Planned Downtime]
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

router.get("/", asyncHandler(async (req, res) => {
    const data = await loadPlannedDowntime();
    res.json(data);
}));

/**
 * @swagger
 * /plannedDowntime/{id}:
 *   get:
 *     summary: Get a planned downtime by ID
 *     tags: [Planned Downtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the planned downtime to retrieve.
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

router.get("/:id", asyncHandler(async (req, res) => {
    const { id } = req.params;
    const plannedDowntime = await loadPlannedDowntimeById(id);
    if (!plannedDowntime) {
        return res.status(404).json({ message: "Planned downtime not found" });
    }
    res.json(plannedDowntime);
}));

/**
 * @swagger
 * /plannedDowntime:
 *   post:
 *     summary: Create a new planned downtime
 *     tags: [Planned Downtime]
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
 *         description: Error creating planned downtime.
 */

router.post("/", asyncHandler(async (req, res) => {
    const newData = {...req.body};
    const createdDowntime = await createPlannedDowntime(newData);
    res.status(201).json(createdDowntime);
}));

/**
 * @swagger
 * /plannedDowntime/{id}:
 *   put:
 *     summary: Update an existing planned downtime
 *     tags: [Planned Downtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the planned downtime to update.
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
 *         description: Error updating planned downtime.
 */

router.put("/:id", asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updatedData = {...req.body};
    const updatedDowntime = await updatePlannedDowntime(id, updatedData);
    if (!updatedDowntime) {
        return res.status(404).json({ message: "Planned downtime not found" });
    }
    res.json(updatedDowntime);
}));

/**
 * @swagger
 * /plannedDowntime/{id}:
 *   delete:
 *     summary: Delete a planned downtime
 *     tags: [Planned Downtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the planned downtime to delete.
 *     responses:
 *       204:
 *         description: Planned downtime deleted successfully.
 *       404:
 *         description: Planned downtime not found.
 *       500:
 *         description: Error deleting planned downtime.
 */

router.delete("/:id", asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await deletePlannedDowntime(id);
    if (!result) {
        return res.status(404).json({ message: "Planned downtime not found" });
    }
    res.status(204).send();
}));

module.exports = router;

const express = require("express");
const {
    loadUnplannedDowntime,
    saveUnplannedDowntime,
} = require("../services/unplannedDowntimeService");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// Utility function to calculate duration in minutes
function calculateDurationInMinutes(start, end) {
    const startTime = moment(start);
    const endTime = moment(end);
    return endTime.diff(startTime, "minutes");
}

// Data validation utility
function validateDowntime(downtime) {
    const requiredFields = ["Start", "End", "ProcessOrderNumber", "machine_id"];
    requiredFields.forEach((field) => {
        if (!downtime[field]) {
            throw new Error(`Missing required field: ${field}`);
        }
    });
}

/**
 * @swagger
 * tags:
 *   name: Unplanned Downtime
 *   description: API for managing unplanned downtimes
 */

/**
 * @swagger
 * /unplanneddowntime:
 *   get:
 *     summary: Retrieve all unplanned downtimes
 *     tags: [Unplanned Downtime]
 *     responses:
 *       200:
 *         description: A list of unplanned downtimes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/", async (req, res) => {
    try {
        let data = await loadUnplannedDowntime();
        data = data.map((downtime) => ({
            ...downtime,
            durationInMinutes: calculateDurationInMinutes(downtime.Start, downtime.End),
        }));
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Error loading unplanned downtimes" });
    }
});

/**
 * @swagger
 * /unplanneddowntime/processorder/{processOrderNumber}:
 *   get:
 *     summary: Retrieve unplanned downtimes by process order number
 *     tags: [Unplanned Downtime]
 *     parameters:
 *       - in: path
 *         name: processOrderNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Unplanned downtimes for the specified process order number
 *       404:
 *         description: No unplanned downtimes found for the specified process order number
 */
router.get("/processorder/:processOrderNumber", async (req, res) => {
    try {
        const processOrderNumber = req.params.processOrderNumber;
        const data = await loadUnplannedDowntime();

        const filteredData = data.filter(
            (downtime) => downtime.ProcessOrderNumber?.toString() === processOrderNumber.toString()
        );

        if (filteredData.length > 0) {
            res.json(filteredData);
        } else {
            res.status(404).json({
                message: "No unplanned downtime found for the specified process order number",
            });
        }
    } catch (error) {
        res.status(500).json({ message: "Error loading unplanned downtimes" });
    }
});

/**
 * @swagger
 * /unplanneddowntime:
 *   post:
 *     summary: Add a new unplanned downtime
 *     tags: [Unplanned Downtime]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Start:
 *                 type: string
 *                 example: "2024-11-24T10:00:00.000Z"
 *               End:
 *                 type: string
 *                 example: "2024-11-24T12:00:00.000Z"
 *               ProcessOrderNumber:
 *                 type: string
 *                 example: "12345"
 *               machine_id:
 *                 type: string
 *                 example: "4"
 *     responses:
 *       201:
 *         description: Unplanned downtime added successfully
 *       400:
 *         description: Validation error or missing fields
 */
router.post("/", async (req, res) => {
    try {
        const data = await loadUnplannedDowntime();
        const newData = { ...req.body, ID: uuidv4() };
        validateDowntime(newData);
        data.push(newData);
        await saveUnplannedDowntime(data);
        res.status(201).json({ message: "Unplanned downtime added successfully", ID: newData.ID });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * @swagger
 * /unplanneddowntime/{id}:
 *   put:
 *     summary: Update an unplanned downtime by ID
 *     tags: [Unplanned Downtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Start:
 *                 type: string
 *               End:
 *                 type: string
 *               ProcessOrderNumber:
 *                 type: string
 *               machine_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Unplanned downtime updated successfully
 *       404:
 *         description: Unplanned downtime not found
 */
router.put("/:id", async (req, res) => {
    try {
        const data = await loadUnplannedDowntime();
        const id = req.params.id;

        const index = data.findIndex((item) => item.ID && item.ID.toString() === id.toString());

        if (index !== -1) {
            const updatedData = { ...data[index], ...req.body, ID: id };
            data[index] = updatedData;
            await saveUnplannedDowntime(data);
            res.status(200).json({ message: "Unplanned downtime updated successfully", updatedData });
        } else {
            res.status(404).json({ message: "Unplanned downtime not found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error updating unplanned downtime" });
    }
});

/**
 * @swagger
 * /unplanneddowntime/{id}:
 *   delete:
 *     summary: Delete an unplanned downtime by ID
 *     tags: [Unplanned Downtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Unplanned downtime deleted successfully
 *       404:
 *         description: Unplanned downtime not found
 */
router.delete("/:id", async (req, res) => {
    try {
        const data = await loadUnplannedDowntime();
        const id = req.params.id;

        const filteredData = data.filter((item) => item.ID && item.ID.toString() !== id.toString());

        if (filteredData.length < data.length) {
            await saveUnplannedDowntime(filteredData);
            res.status(200).json({ message: "Unplanned downtime deleted successfully" });
        } else {
            res.status(404).json({ message: "Unplanned downtime not found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error deleting unplanned downtime" });
    }
});

module.exports = router;

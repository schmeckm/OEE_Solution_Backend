const express = require("express");
const {
    loadPlannedDowntime,
    savePlannedDowntime,
} = require("../services/plannedDowntimeService");
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
 *   name: Planned Downtime
 *   description: API for managing planned downtimes
 */

/**
 * @swagger
 * /planneddowntime:
 *   get:
 *     summary: Retrieve all planned downtimes
 *     tags: [Planned Downtime]
 *     responses:
 *       200:
 *         description: A list of planned downtimes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/", async (req, res) => {
    try {
        console.log("[DEBUG] Fetching all planned downtimes...");
        let data = await loadPlannedDowntime();
        data = data.map((downtime) => ({
            ...downtime,
            durationInMinutes: calculateDurationInMinutes(downtime.Start, downtime.End),
        }));
        console.log("[DEBUG] Retrieved planned downtimes:", data);
        res.json(data);
    } catch (error) {
        console.error("[ERROR] Failed to fetch planned downtimes:", error.message);
        res.status(500).json({ message: "Error loading planned downtimes" });
    }
});

/**
 * @swagger
 * /planneddowntime:
 *   post:
 *     summary: Add a new planned downtime
 *     tags: [Planned Downtime]
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
 *       201:
 *         description: Planned downtime added successfully
 *       400:
 *         description: Validation error or missing fields
 */
router.post("/", async (req, res) => {
    try {
        console.log("[DEBUG] Adding new planned downtime...");
        const data = await loadPlannedDowntime();
        const newData = { ...req.body, ID: uuidv4() };
        validateDowntime(newData);
        data.push(newData);
        await savePlannedDowntime(data);
        console.log("[DEBUG] New planned downtime added:", newData);
        res.status(201).json({ message: "Planned downtime added successfully", ID: newData.ID });
    } catch (error) {
        console.error("[ERROR] Failed to add planned downtime:", error.message);
        res.status(400).json({ message: error.message });
    }
});

/**
 * @swagger
 * /planneddowntime/{id}:
 *   put:
 *     summary: Update a planned downtime by ID
 *     tags: [Planned Downtime]
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
 *         description: Planned downtime updated successfully
 *       404:
 *         description: Planned downtime not found
 */
router.put("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        console.log("[DEBUG] Updating planned downtime with ID:", id);
        console.log("[DEBUG] Incoming Payload:", req.body);

        const data = await loadPlannedDowntime();
        const index = data.findIndex((item) => item.ID && item.ID.toString() === id.toString());

        if (index !== -1) {
            const updatedData = { ...data[index], ...req.body, ID: id };
            data[index] = updatedData;
            await savePlannedDowntime(data);
            console.log("[DEBUG] Updated planned downtime:", updatedData);
            res.status(200).json({ message: "Planned downtime updated successfully", updatedData });
        } else {
            console.error("[ERROR] Planned downtime not found for ID:", id);
            res.status(404).json({ message: "Planned downtime not found" });
        }
    } catch (error) {
        console.error("[ERROR] Failed to update planned downtime:", error.message);
        res.status(500).json({ message: "Error updating planned downtime" });
    }
});

/**
 * @swagger
 * /planneddowntime/{id}:
 *   delete:
 *     summary: Delete a planned downtime by ID
 *     tags: [Planned Downtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Planned downtime deleted successfully
 *       404:
 *         description: Planned downtime not found
 */
router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        console.log("[DEBUG] Deleting planned downtime with ID:", id);

        const data = await loadPlannedDowntime();
        const filteredData = data.filter((item) => item.ID && item.ID.toString() !== id.toString());

        if (filteredData.length < data.length) {
            await savePlannedDowntime(filteredData);
            console.log("[DEBUG] Remaining planned downtimes:", filteredData);
            res.status(200).json({ message: "Planned downtime deleted successfully" });
        } else {
            console.error("[ERROR] Planned downtime not found for ID:", id);
            res.status(404).json({ message: "Planned downtime not found" });
        }
    } catch (error) {
        console.error("[ERROR] Failed to delete planned downtime:", error.message);
        res.status(500).json({ message: "Error deleting planned downtime" });
    }
});

module.exports = router;

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
        let data = await loadPlannedDowntime();
        data = data.map((downtime) => ({
            ...downtime,
            durationInMinutes: calculateDurationInMinutes(downtime.Start, downtime.End),
        }));
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Error loading planned downtimes" });
    }
});

/**
 * @swagger
 * /planneddowntime/processorder/{processOrderNumber}:
 *   get:
 *     summary: Retrieve planned downtimes by process order number
 *     tags: [Planned Downtime]
 *     parameters:
 *       - in: path
 *         name: processOrderNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Planned downtimes for the specified process order number
 *       404:
 *         description: No planned downtimes found for the specified process order number
 */
router.get("/processorder/:processOrderNumber", async (req, res) => {
    try {
        const processOrderNumber = req.params.processOrderNumber;
        const data = await loadPlannedDowntime();

        const filteredData = data.filter(
            (downtime) => downtime.ProcessOrderNumber?.toString() === processOrderNumber.toString()
        );

        if (filteredData.length > 0) {
            res.json(filteredData);
        } else {
            res.status(404).json({
                message: "No planned downtime found for the specified process order number",
            });
        }
    } catch (error) {
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
 *         description: Planned downtime added successfully
 *       400:
 *         description: Validation error or missing fields
 */
router.post("/", async (req, res) => {
    try {
        const data = await loadPlannedDowntime();
        const newData = { ...req.body, ID: uuidv4() };
        validateDowntime(newData);
        data.push(newData);
        await savePlannedDowntime(data);
        res.status(201).json({ message: "Planned downtime added successfully", ID: newData.ID });
    } catch (error) {
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
        console.log("[DEBUG] Incoming ID for update:", id);
        console.log("[DEBUG] Payload:", req.body);

        const data = await loadPlannedDowntime();
        const index = data.findIndex((item) => item.ID && item.ID.toString() === id.toString());
        console.log("[DEBUG] Index found:", index);

        if (index !== -1) {
            const updatedData = { ...data[index], ...req.body, ID: id };
            console.log("[DEBUG] Updated data:", updatedData);

            data[index] = updatedData;
            await savePlannedDowntime(data);
            res.status(200).json({ message: "Planned downtime updated successfully", updatedData });
        } else {
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
        console.log("[DEBUG] Incoming ID for delete:", id);

        const data = await loadPlannedDowntime();
        const filteredData = data.filter((item) => item.ID && item.ID.toString() !== id.toString());
        console.log("[DEBUG] Filtered data length:", filteredData.length);

        if (filteredData.length < data.length) {
            await savePlannedDowntime(filteredData);
            res.status(200).json({ message: "Planned downtime deleted successfully" });
        } else {
            res.status(404).json({ message: "Planned downtime not found" });
        }
    } catch (error) {
        console.error("[ERROR] Failed to delete planned downtime:", error.message);
        res.status(500).json({ message: "Error deleting planned downtime" });
    }
});

module.exports = router;

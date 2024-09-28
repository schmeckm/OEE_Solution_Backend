const express = require("express");
const {
  loadUnplannedDowntime,
  saveUnplannedDowntime,
  getUnplannedDowntimeByProcessOrderNumber,
  getUnplannedDowntimeByMachineId,
} = require("../services/unplannedDowntimeService");
const moment = require("moment");

const router = express.Router();

// Utility function to calculate duration in minutes
function calculateDurationInMinutes(start, end) {
  const startTime = moment(start);
  const endTime = moment(end);
  return endTime.diff(startTime, "minutes");
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
 *     summary: Get all unplanned downtimes
 *     tags: [Unplanned Downtime]
 *     description: Retrieve a list of all unplanned downtimes.
 *     responses:
 *       200:
 *         description: A list of unplanned downtimes.
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
      durationInMinutes: calculateDurationInMinutes(
        downtime.Start,
        downtime.End
      ),
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
 *     summary: Get unplanned downtime by Process Order Number
 *     tags: [Unplanned Downtime]
 *     description: Retrieve unplanned downtimes for a specific process order.
 *     parameters:
 *       - in: path
 *         name: processOrderNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: The process order number to filter by.
 *     responses:
 *       200:
 *         description: A list of unplanned downtimes for the specified process order.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       404:
 *         description: No unplanned downtime found for the specified process order number.
 */
router.get("/processorder/:processOrderNumber", async (req, res) => {
  try {
    const processOrderNumber = req.params.processOrderNumber;
    let data = await getUnplannedDowntimeByProcessOrderNumber(
      processOrderNumber
    );

    if (data.length > 0) {
      data = data.map((downtime) => ({
        ...downtime,
        durationInMinutes: calculateDurationInMinutes(
          downtime.Start,
          downtime.End
        ),
      }));
      res.json(data);
    } else {
      res
        .status(404)
        .json({
          message:
            "No unplanned downtime found for the specified process order number",
        });
    }
  } catch (error) {
    res.status(500).json({ message: "Error loading unplanned downtimes" });
  }
});

/**
 * @swagger
 * /unplanneddowntime/machine/{machineId}:
 *   get:
 *     summary: Get unplanned downtime by Machine ID
 *     tags: [Unplanned Downtime]
 *     description: Retrieve unplanned downtimes for a specific machine.
 *     parameters:
 *       - in: path
 *         name: machineId
 *         required: true
 *         schema:
 *           type: string
 *         description: The machine ID to filter by.
 *     responses:
 *       200:
 *         description: A list of unplanned downtimes for the specified machine ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       404:
 *         description: No unplanned downtime found for the specified machine ID.
 */
router.get("/machine/:machineId", async (req, res) => {
  try {
    const machineId = req.params.machineId;
    let data = await getUnplannedDowntimeByMachineId(machineId);

    if (data.length > 0) {
      data = data.map((downtime) => ({
        ...downtime,
        durationInMinutes: calculateDurationInMinutes(
          downtime.Start,
          downtime.End
        ),
      }));
      res.json(data);
    } else {
      res
        .status(404)
        .json({
          message: "No unplanned downtime found for the specified machine ID",
        });
    }
  } catch (error) {
    res.status(500).json({ message: "Error loading unplanned downtimes" });
  }
});

/**
 * @swagger
 * /unplanneddowntime/{id}:
 *   get:
 *     summary: Get a specific unplanned downtime
 *     tags: [Unplanned Downtime]
 *     description: Retrieve a single unplanned downtime by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unplanned downtime ID.
 *     responses:
 *       200:
 *         description: A specific unplanned downtime object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Unplanned downtime not found.
 */
router.get("/:id", async (req, res) => {
  try {
    let data = await loadUnplannedDowntime();
    const id = req.params.id;
    const downtime = data.find((d) => d.ID === id);
    if (downtime) {
      const downtimeWithDuration = {
        ...downtime,
        durationInMinutes: calculateDurationInMinutes(
          downtime.Start,
          downtime.End
        ),
      };
      res.json(downtimeWithDuration);
    } else {
      res.status(404).json({ message: "Unplanned downtime not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error loading unplanned downtime" });
  }
});

/**
 * @swagger
 * /unplanneddowntime:
 *   post:
 *     summary: Add a new unplanned downtime
 *     tags: [Unplanned Downtime]
 *     description: Create a new unplanned downtime.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ID:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Unplanned downtime added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post("/", async (req, res) => {
  try {
    const data = await loadUnplannedDowntime();
    const newData = req.body;
    data.push(newData);
    await saveUnplannedDowntime(data);
    res.status(201).json({ message: "Unplanned downtime added successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error saving unplanned downtime" });
  }
});

/**
 * @swagger
 * /unplanneddowntime/{id}:
 *   put:
 *     summary: Update an existing unplanned downtime
 *     tags: [Unplanned Downtime]
 *     description: Update the details of an existing unplanned downtime.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unplanned downtime ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Unplanned downtime updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Unplanned downtime not found.
 */
router.put("/:id", async (req, res) => {
  try {
    const data = await loadUnplannedDowntime();
    const id = req.params.id;
    const updatedData = req.body;
    const index = data.findIndex((item) => item.ID === id);
    if (index !== -1) {
      data[index] = updatedData;
      await saveUnplannedDowntime(data);
      res
        .status(200)
        .json({ message: "Unplanned downtime updated successfully" });
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
 *     summary: Delete an unplanned downtime
 *     tags: [Unplanned Downtime]
 *     description: Remove an unplanned downtime from the list.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unplanned downtime ID.
 *     responses:
 *       200:
 *         description: Unplanned downtime deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Unplanned downtime not found.
 */
router.delete("/:id", async (req, res) => {
  try {
    let data = await loadUnplannedDowntime();
    const initialLength = data.length;
    data = data.filter((item) => item.ID !== req.params.id);
    if (data.length !== initialLength) {
      await saveUnplannedDowntime(data);
      res
        .status(200)
        .json({ message: "Unplanned downtime deleted successfully" });
    } else {
      res.status(404).json({ message: "Unplanned downtime not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error deleting unplanned downtime" });
  }
});

module.exports = router;

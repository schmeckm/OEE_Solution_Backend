const express = require("express");
const { loadDataAndPrepareOEE } = require("../services/prepareOEEServices");
const router = express.Router();

/**
 * @swagger
 * /prepareOEE/oee/{machineId}:
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
 *       500:
 *         description: An error occurred while processing the OEE data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get("/oee/:machineId", async (req, res) => {
  const { machineId } = req.params;

  try {
    const oeeData = await loadDataAndPrepareOEE(machineId);
    res.json(oeeData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

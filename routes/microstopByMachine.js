const express = require("express");
const router = express.Router();
const {
  aggregateMicrostopsByMachine,
} = require("../services/microstopAggregationByMachine");
const { defaultLogger, errorLogger } = require("../utils/logger");
const moment = require("moment-timezone"); // Ensure moment-timezone is installed
/**
 * @swagger
 * /microstop-aggregation/machine:
 *   get:
 *     summary: Get aggregated microstop data, optionally filtered by machine ID and date range
 *     tags: [Microstop Aggregation]
 *     description: Retrieves an aggregation of microstop data, optionally filtered by a specific machine ID and date range.
 *     parameters:
 *       - in: query
 *         name: machine_id
 *         required: false
 *         description: The unique identifier of the machine to filter the microstops by.
 *         schema:
 *           type: string
 *       - in: query
 *         name: start
 *         required: false
 *         description: Start date for filtering microstops, in ISO 8601 format.
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: end
 *         required: false
 *         description: End date for filtering microstops, in ISO 8601 format.
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Successfully retrieved aggregated microstop data.
 *       404:
 *         description: No data found for the given filters.
 *       500:
 *         description: Internal server error.
 */

router.get("/", async (req, res) => {
  const { machine_id, start, end } = req.query;
  const startDate = start ? moment(start).toISOString() : null;
  const endDate = end ? moment(end).toISOString() : null;

  try {
    const result = await aggregateMicrostopsByMachine(
      machine_id,
      startDate,
      endDate
    );
    if (!result || Object.keys(result).length === 0) {
      return res
        .status(404)
        .json({ message: "No data found for the given filters." });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;

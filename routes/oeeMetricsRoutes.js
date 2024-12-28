const express = require('express');
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');
const { writeOEEToInfluxDB, readOEEFromInfluxDB } = require('../services/oeeMetricsService');
const router = express.Router();

// Middleware zur zentralisierten Fehlerbehandlung
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Definieren der validateAndSanitize Funktion
const validateAndSanitize = (data, schema) => {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
      throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);
  }

  // Sanitize all string values in the data object
  const sanitizedData = {};
  Object.keys(value).forEach(key => {
      sanitizedData[key] = typeof value[key] === 'string' ? sanitizeHtml(value[key]) : value[key];
  });

  return sanitizedData;
};


// Validation schemas defined outside of the request handlers for reuse
const oeeMetricsSchema = Joi.object({
  processData: Joi.object({
    plant: Joi.string().required(),
    area: Joi.string().required(),
    machineId: Joi.string().required(),
    ProcessOrderNumber: Joi.string().required(),
    MaterialNumber: Joi.string().required(),
    MaterialDescription: Joi.string().required(),
    plannedProductionQuantity: Joi.number().required(),
    plannedDowntime: Joi.number().required(),
    unplannedDowntime: Joi.number().required(),
    microstops: Joi.number().required(),
  }).required(),
  oee: Joi.number().min(0).max(100).required(),
  availability: Joi.number().min(0).max(100).required(),
  performance: Joi.number().min(0).max(100).required(),
  quality: Joi.number().min(0).max(100).required(),
});

const querySchema = Joi.object({
  plant: Joi.string().optional(),
  area: Joi.string().optional(),
  machineId: Joi.string().optional(),
  processOrder: Joi.string().optional(),
});

/**
 * @swagger
 * /write-oee-metrics:
 *   post:
 *     summary: Write OEE metrics to InfluxDB
 *     description: Accepts OEE metrics data and writes them using the OEE Metrics Service into InfluxDB.
 *     tags:
 *       - OEE Metrics
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - processData
 *               - oee
 *               - availability
 *               - performance
 *               - quality
 *             properties:
 *               processData:
 *                 type: object
 *                 required:
 *                   - plant
 *                   - area
 *                   - machineId
 *                   - ProcessOrderNumber
 *                   - MaterialNumber
 *                   - MaterialDescription
 *                   - plannedProductionQuantity
 *                   - plannedDowntime
 *                   - unplannedDowntime
 *                   - microstops
 *                 properties:
 *                   plant:
 *                     type: string
 *                   area:
 *                     type: string
 *                   machineId:
 *                     type: string
 *                   ProcessOrderNumber:
 *                     type: string
 *                   MaterialNumber:
 *                     type: string
 *                   MaterialDescription:
 *                     type: string
 *                   plannedProductionQuantity:
 *                     type: number
 *                   plannedDowntime:
 *                     type: number
 *                   unplannedDowntime:
 *                     type: number
 *                   microstops:
 *                     type: number
 *               oee:
 *                 type: number
 *                 format: double
 *               availability:
 *                 type: number
 *                 format: double
 *               performance:
 *                 type: number
 *                 format: double
 *               quality:
 *                 type: number
 *                 format: double
 *     responses:
 *       200:
 *         description: Metrics successfully written.
 *       400:
 *         description: Invalid input data.
 *       500:
 *         description: Server error during data writing.
 */
router.post('/write-oee-metrics', asyncHandler(async (req, res) => {
  try {
    const sanitizedData = validateAndSanitize(req.body, oeeMetricsSchema);
    await writeOEEToInfluxDB(sanitizedData);
    res.status(200).json({ message: 'Metrics successfully written.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}));
/**
 * @swagger
 * /oee-metrics/read-oee-metrics:
 *   get:
 *     summary: Read OEE metrics from InfluxDB
 *     description: Retrieves OEE metrics data from InfluxDB based on optional filters like Plant, Area, Machine ID, Process Order, Start Time, and End Time.
 *     tags:
 *       - OEE Metrics
 *     parameters:
 *       - in: query
 *         name: plant
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by Plant.
 *       - in: query
 *         name: area
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by Area.
 *       - in: query
 *         name: machineId
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by Machine ID.
 *       - in: query
 *         name: processOrder
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by Process Order Number.
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: Filter by Start Time (ISO 8601 format).
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: Filter by End Time (ISO 8601 format).
 *     responses:
 *       200:
 *         description: Metrics successfully retrieved.
 *       404:
 *         description: No metrics found.
 *       400:
 *         description: Invalid query parameters.
 *       500:
 *         description: Server error during data retrieval.
 */

router.get('/read-oee-metrics', asyncHandler(async (req, res) => {
  try {
    const filters = validateAndSanitize(req.query, querySchema);
    const rawData = await readOEEFromInfluxDB(filters);

    if (rawData.length > 0) {
      const processedData = rawData.map(item => ({
        id: item[1],
        periodStart: new Date(item[2]).toISOString(),
        periodEnd: new Date(item[3]).toISOString(),
        timestamp: new Date(item[4]).toISOString(),
        value: parseFloat(item[5]),
        department: item[6],
        processOrderNumber: item[7],
        materialNumber: item[8],
        metricType: item[9],
        measurementName: item[10],
        area: item[11],
        machineId: item[12],
        plant: item[13]
      }));
      
      res.status(200).json(processedData);
    } else {
      res.status(404).json({ message: 'No metrics found.' });
    }
  } catch (error) {
    console.error('Error retrieving OEE metrics:', error);
    res.status(400).json({ message: 'Error processing your request' });
  }
}));

module.exports = router;
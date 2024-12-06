const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");
const Joi = require("joi");
const sanitizeHtml = require("sanitize-html");

const {
  loadProcessOrders,
  saveProcessOrders,
} = require("../services/processOrderService");
const { dateSettings } = require("../config/config");

// Utility function for date formatting
const formatDate = (date) =>
  date
    ? moment(date).tz(dateSettings.timezone).format(dateSettings.dateFormat)
    : null;

// Centralized error handling middleware
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @swagger
 * tags:
 *   name: Process Orders
 *   description: API for managing process orders
 */

/**
 * @swagger
 * /processorders:
 *   get:
 *     summary: Get all process orders
 *     tags: [Process Orders]
 *     description: Retrieve a list of all process orders.
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *         description: Number of items per page.
 *     responses:
 *       200:
 *         description: A list of process orders.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    let data = await loadProcessOrders(); // Load all process orders

    // Pagination logic
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Format date fields
    data = data.map((order) => ({
      ...order,
      Start: formatDate(order.Start),
      End: formatDate(order.End),
      ActualProcessOrderStart: formatDate(order.ActualProcessOrderStart),
      ActualProcessOrderEnd: formatDate(order.ActualProcessOrderEnd),
    }));

    const paginatedData = data.slice(startIndex, endIndex);

    res.json({
      totalItems: data.length,
      currentPage: page,
      totalPages: Math.ceil(data.length / limit),
      data: paginatedData,
    });
  })
);

/**
 * @swagger
 * /processorders/rel:
 *   get:
 *     summary: Get all process orders with status REL for a specific machine
 *     tags: [Process Orders]
 *     description: Retrieve a list of all process orders with status REL for a specific machine.
 *     parameters:
 *       - in: query
 *         name: machineId
 *         required: false
 *         schema:
 *           type: string
 *         description: The machine ID to filter process orders.
 *       - in: query
 *         name: mark
 *         required: false
 *         schema:
 *           type: boolean
 *         description: If true, mark the filtered orders with an 'X'.
 *     responses:
 *       200:
 *         description: A list of process orders with status REL for the specified machine.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get(
  "/rel",
  asyncHandler(async (req, res) => {
    const mark = req.query.mark === "true";
    const machineId = req.query.machineId;

    let data = await loadProcessOrders();

    // Filter process orders by status REL and optionally by machineId
    data = data.filter(
      (order) =>
        order.ProcessOrderStatus === "REL" &&
        (!machineId || order.machine_id === machineId)
    );

    // Optionally mark the filtered orders
    if (mark) {
      data = data.map((order) => ({
        ...order,
        marked: "X",
      }));
    }

    // Format date fields
    data = data.map((order) => ({
      ...order,
      Start: formatDate(order.Start),
      End: formatDate(order.End),
      ActualProcessOrderStart: formatDate(order.ActualProcessOrderStart),
      ActualProcessOrderEnd: formatDate(order.ActualProcessOrderEnd),
    }));

    res.json(data);
  })
);

/**
 * @swagger
 * /processorders:
 *   post:
 *     summary: Add a new process order
 *     tags: [Process Orders]
 *     description: Create a new process order.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProcessOrder'
 *     responses:
 *       201:
 *         description: Process order added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    // Input validation schema
    const schema = Joi.object({
      description: Joi.string().required(),
      Start: Joi.date().required(),
      End: Joi.date().required(),
      ActualProcessOrderStart: Joi.date().optional().allow(null),
      ActualProcessOrderEnd: Joi.date().optional().allow(null),
      ProcessOrderStatus: Joi.string().required(),
      machine_id: Joi.string().required(),
      // Add other required fields here
    });

    const { error, value } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const data = await loadProcessOrders();
    const newData = value;

    // Sanitize inputs
    newData.description = sanitizeHtml(newData.description);
    newData.machine_id = sanitizeHtml(newData.machine_id);

    // Generate a new UUID for order_id
    newData.order_id = uuidv4();

    // Format date fields
    newData.Start = formatDate(newData.Start);
    newData.End = formatDate(newData.End);
    newData.ActualProcessOrderStart = formatDate(newData.ActualProcessOrderStart);
    newData.ActualProcessOrderEnd = formatDate(newData.ActualProcessOrderEnd);

    data.push(newData);
    await saveProcessOrders(data);
    res.status(201).json({ message: "Process order added successfully" });
  })
);

/**
 * @swagger
 * /processorders/{id}:
 *   put:
 *     summary: Update an existing process order
 *     tags: [Process Orders]
 *     description: Update the details of an existing process order.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The process order UUID (order_id).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProcessOrder'
 *     responses:
 *       200:
 *         description: Process order updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Process order not found.
 */
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    // Input validation schema
    const schema = Joi.object({
      description: Joi.string().required(),
      Start: Joi.date().required(),
      End: Joi.date().required(),
      ActualProcessOrderStart: Joi.date().optional().allow(null),
      ActualProcessOrderEnd: Joi.date().optional().allow(null),
      ProcessOrderStatus: Joi.string().required(),
      machine_id: Joi.string().required(),
      // Add other required fields here
    });

    const { error, value } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const data = await loadProcessOrders();
    const id = req.params.id;
    const index = data.findIndex((item) => item.order_id === id);

    if (index !== -1) {
      const updatedData = value;

      // Sanitize inputs
      updatedData.description = sanitizeHtml(updatedData.description);
      updatedData.machine_id = sanitizeHtml(updatedData.machine_id);

      // Preserve the original order_id
      updatedData.order_id = id;

      // Format date fields
      updatedData.Start = formatDate(updatedData.Start);
      updatedData.End = formatDate(updatedData.End);
      updatedData.ActualProcessOrderStart = formatDate(
        updatedData.ActualProcessOrderStart
      );
      updatedData.ActualProcessOrderEnd = formatDate(
        updatedData.ActualProcessOrderEnd
      );

      data[index] = updatedData;
      await saveProcessOrders(data);
      res.status(200).json({ message: "Process order updated successfully" });
    } else {
      res.status(404).json({ message: "Process order not found" });
    }
  })
);

/**
 * @swagger
 * /processorders/{id}:
 *   delete:
 *     summary: Delete a process order
 *     tags: [Process Orders]
 *     description: Remove a process order from the list.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The process order UUID (order_id).
 *     responses:
 *       204:
 *         description: Process order deleted successfully.
 *       404:
 *         description: Process order not found.
 */
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = await loadProcessOrders();
    const id = req.params.id;
    const newData = data.filter((item) => item.order_id !== id);

    if (data.length !== newData.length) {
      await saveProcessOrders(newData);
      res.status(204).send();
    } else {
      res.status(404).json({ message: "Process order not found" });
    }
  })
);

module.exports = router;

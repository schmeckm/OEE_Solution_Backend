const express = require("express");
const router = express.Router();
const moment = require("moment-timezone");

const {
  loadProcessOrders,
  saveProcessOrders,
} = require("../services/processOrderService");
const { dateSettings } = require("../config/config"); // Import the date settings from your config

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
router.get("/", (req, res) => {
  let data = loadProcessOrders(); // Load all process orders from the service

  // Format all date fields in the process orders
  data = data.map((order) => ({
    ...order,
    Start: moment(order.Start)
      .tz(dateSettings.timezone)
      .format(dateSettings.dateFormat),
    End: moment(order.End)
      .tz(dateSettings.timezone)
      .format(dateSettings.dateFormat),
    ActualProcessOrderStart: order.ActualProcessOrderStart
      ? moment(order.ActualProcessOrderStart)
          .tz(dateSettings.timezone)
          .format(dateSettings.dateFormat)
      : null,
    ActualProcessOrderEnd: order.ActualProcessOrderEnd
      ? moment(order.ActualProcessOrderEnd)
          .tz(dateSettings.timezone)
          .format(dateSettings.dateFormat)
      : null,
  }));

  res.json(data); // Return the list of process orders as a JSON response
});

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
router.get("/rel", (req, res) => {
  const mark = req.query.mark === "true";
  const machineId = req.query.machineId;

  let data = loadProcessOrders();

  // Filter process orders by status REL and optionally by machineId
  data = data.filter(
    (order) =>
      order.ProcessOrderStatus === "REL" &&
      (!machineId || order.machine_id === machineId)
  );

  // Optionally mark the filtered orders
  if (mark) {
    data = data.map((order) => {
      order.marked = "X"; // Set a mark, such as 'X'
      return order;
    });
  }

  // Format all date fields in the filtered process orders
  data = data.map((order) => ({
    ...order,
    Start: moment(order.Start)
      .tz(dateSettings.timezone)
      .format(dateSettings.dateFormat),
    End: moment(order.End)
      .tz(dateSettings.timezone)
      .format(dateSettings.dateFormat),
    ActualProcessOrderStart: order.ActualProcessOrderStart
      ? moment(order.ActualProcessOrderStart)
          .tz(dateSettings.timezone)
          .format(dateSettings.dateFormat)
      : null,
    ActualProcessOrderEnd: order.ActualProcessOrderEnd
      ? moment(order.ActualProcessOrderEnd)
          .tz(dateSettings.timezone)
          .format(dateSettings.dateFormat)
      : null,
  }));

  res.json(data); // Return the filtered and optionally marked list of process orders
});

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
 *             type: object
 *             properties:
 *               order_id:
 *                 type: integer
 *               description:
 *                 type: string
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
router.post("/", (req, res) => {
  const data = loadProcessOrders();
  const newData = req.body;

  // Format all date fields before saving
  newData.Start = moment(newData.Start)
    .tz(dateSettings.timezone)
    .format(dateSettings.dateFormat);
  newData.End = moment(newData.End)
    .tz(dateSettings.timezone)
    .format(dateSettings.dateFormat);

  if (newData.ActualProcessOrderStart) {
    newData.ActualProcessOrderStart = moment(newData.ActualProcessOrderStart)
      .tz(dateSettings.timezone)
      .format(dateSettings.dateFormat);
  }

  if (newData.ActualProcessOrderEnd) {
    newData.ActualProcessOrderEnd = moment(newData.ActualProcessOrderEnd)
      .tz(dateSettings.timezone)
      .format(dateSettings.dateFormat);
  }

  data.push(newData);
  saveProcessOrders(data);
  res.status(201).json({ message: "Process order added successfully" });
});

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
 *           type: integer
 *         description: The process order ID.
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
router.put("/:id", (req, res) => {
  const data = loadProcessOrders();
  const id = parseInt(req.params.id);
  const updatedData = req.body;
  const index = data.findIndex((item) => item.order_id === id);

  if (index !== -1) {
    // Format all date fields before saving
    updatedData.Start = moment(updatedData.Start)
      .tz(dateSettings.timezone)
      .format(dateSettings.dateFormat);
    updatedData.End = moment(updatedData.End)
      .tz(dateSettings.timezone)
      .format(dateSettings.dateFormat);

    if (updatedData.ActualProcessOrderStart) {
      updatedData.ActualProcessOrderStart = moment(
        updatedData.ActualProcessOrderStart
      )
        .tz(dateSettings.timezone)
        .format(dateSettings.dateFormat);
    }

    if (updatedData.ActualProcessOrderEnd) {
      updatedData.ActualProcessOrderEnd = moment(
        updatedData.ActualProcessOrderEnd
      )
        .tz(dateSettings.timezone)
        .format(dateSettings.dateFormat);
    }

    data[index] = updatedData;
    saveProcessOrders(data);
    res.status(200).json({ message: "Process order updated successfully" });
  } else {
    res.status(404).json({ message: "Process order not found" });
  }
});

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
 *           type: integer
 *         description: The process order ID.
 *     responses:
 *       200:
 *         description: Process order deleted successfully.
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
router.delete("/:id", (req, res) => {
  const data = loadProcessOrders();
  const id = parseInt(req.params.id);
  const newData = data.filter((item) => item.order_id !== id);

  if (data.length !== newData.length) {
    saveProcessOrders(newData);
    res.status(200).json({ message: "Process order deleted successfully" });
  } else {
    res.status(404).json({ message: "Process order not found" });
  }
});

module.exports = router;

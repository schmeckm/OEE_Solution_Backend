/******************************************************
 * processOrders.js
 ******************************************************/

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment"); // We'll use moment for UTC parsing and formatting

// Import the service-layer functions
const {
  loadAllProcessOrders,
  loadProcessOrderById,
  createProcessOrder,
  updateProcessOrder,
  deleteProcessOrder,
} = require("../services/processOrderService");

const router = express.Router();

// Helper: Parse date strings to a JS Date in UTC
function parseToUTC(dateString) {
  return dateString ? moment.utc(dateString).toDate() : null;
}

// Helper: Format JS Date objects to ISO 8601 in UTC
function formatToUTC(date) {
  return date ? moment.utc(date).toISOString() : null;
}

// Centralized async error-handling middleware
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @swagger
 * tags:
 *   name: Process Orders
 *   description: API endpoints for managing process orders
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
 *         description: A list of all process orders.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProcessOrder'
 *       500:
 *         description: Server error while fetching process orders.
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    try {
      let data = await loadAllProcessOrders();

      // Convert any Date objects to UTC ISO strings
      data = data.map((order) => ({
        ...order,
        start_date: formatToUTC(order.start_date),
        end_date: formatToUTC(order.end_date),
        actualprocessorderstart: formatToUTC(order.actualprocessorderstart),
        actualprocessorderend: formatToUTC(order.actualprocessorderend),
      }));

      // You could optionally handle "no data" with a 404 if desired:
      // if (!data || data.length === 0) {
      //   return res.status(404).json({ message: "No process orders found." });
      // }

      return res.status(200).json(data);
    } catch (error) {
      console.error("Error fetching process orders:", error);
      return res.status(500).json({ message: "Error fetching process orders" });
    }
  })
);

/**
 * @swagger
 * /processorders/rel:
 *   get:
 *     summary: Get process orders filtered by status (REL vs. non-REL) and optionally by machine ID
 *     tags: [Process Orders]
 *     parameters:
 *       - in: query
 *         name: mark
 *         required: false
 *         schema:
 *           type: boolean
 *         description: If true, only return orders with status "REL"; otherwise, return orders without "REL".
 *       - in: query
 *         name: machineId
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by a specific machine ID
 *     responses:
 *       200:
 *         description: A list of filtered process orders.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProcessOrder'
 *       404:
 *         description: No matching process orders found.
 *       500:
 *         description: Server error while fetching process orders.
 */
router.get(
  "/rel",
  asyncHandler(async (req, res) => {
    try {
      const mark = req.query.mark === "true";
      const machineId = req.query.machineId;

      let data = await loadAllProcessOrders();
      if (!data || data.length === 0) {
        return res.status(404).json({ message: "No process orders found." });
      }

      data = filterProcessOrders(data, mark, machineId);
      const formattedData = data.map((order) => ({
        ...order,
        start_date: formatToUTC(order.start_date),
        end_date: formatToUTC(order.end_date),
        actualprocessorderstart: formatToUTC(order.actualprocessorderstart),
        actualprocessorderend: formatToUTC(order.actualprocessorderend),
      }));

      return res.status(200).json(formattedData);
    } catch (error) {
      console.error("Error fetching filtered process orders:", error);
      return res
        .status(500)
        .json({ message: "Error fetching filtered process orders" });
    }
  })
);

/**
 * @swagger
 * /processorders/{id}:
 *   get:
 *     summary: Get a process order by its ID
 *     tags: [Process Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The UUID of the process order
 *     responses:
 *       200:
 *         description: Returns the requested process order.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProcessOrder'
 *       404:
 *         description: Process order not found.
 *       500:
 *         description: Server error while fetching the process order.
 */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const processOrder = await loadProcessOrderById(id);

      if (!processOrder) {
        return res
          .status(404)
          .json({ message: `Process order with ID ${id} not found` });
      }

      // Convert Date fields to UTC ISO strings
      return res.status(200).json({
        ...processOrder.dataValues,
        start_date: formatToUTC(processOrder.dataValues.start_date),
        end_date: formatToUTC(processOrder.dataValues.end_date),
        actualprocessorderstart: formatToUTC(processOrder.dataValues.actualprocessorderstart),
        actualprocessorderend: formatToUTC(processOrder.dataValues.actualprocessorderend),
      });
    } catch (error) {
      console.error("Error fetching process order:", error);
      return res
        .status(500)
        .json({ message: "Error fetching process order by ID" });
    }
  })
);

/**
 * @swagger
 * /processorders:
 *   post:
 *     summary: Create a new process order
 *     tags: [Process Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProcessOrder'
 *     responses:
 *       201:
 *         description: Successfully created a new process order.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 order_id:
 *                   type: string
 *       500:
 *         description: Server error while creating the process order.
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const newData = {
        ...req.body,
        order_id: uuidv4(),
        start_date: parseToUTC(req.body.start_date),
        end_date: parseToUTC(req.body.end_date),
        actualprocessorderstart: parseToUTC(req.body.actualprocessorderstart),
        actualprocessorderend: parseToUTC(req.body.actualprocessorderend),
      };

      const createdOrder = await createProcessOrder(newData);
      return res.status(201).json({
        message: "Process order added successfully",
        order_id: createdOrder.order_id,
      });
    } catch (error) {
      console.error("Error creating process order:", error);
      return res
        .status(500)
        .json({ message: `Error creating process order: ${error.message}` });
    }
  })
);

/**
 * @swagger
 * /processorders/{id}:
 *   put:
 *     summary: Update an existing process order
 *     tags: [Process Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The UUID of the process order to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProcessOrder'
 *     responses:
 *       200:
 *         description: Successfully updated the process order.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 order_id:
 *                   type: string
 *       404:
 *         description: Process order not found.
 *       500:
 *         description: Server error while updating the process order.
 */
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const updatedData = {
        ...req.body,
        start_date: parseToUTC(req.body.start_date),
        end_date: parseToUTC(req.body.end_date),
        actualprocessorderstart: parseToUTC(req.body.actualprocessorderstart),
        actualprocessorderend: parseToUTC(req.body.actualprocessorderend),
      };

      const updatedOrder = await updateProcessOrder(id, updatedData);
      return res.status(200).json({
        message: "Process order updated successfully",
        order_id: updatedOrder.order_id,
      });
    } catch (error) {
      console.error("Error updating process order:", error);
      return res.status(500).json({ message: "Failed to update process order" });
    }
  })
);

/**
 * @swagger
 * /processorders/{id}:
 *   delete:
 *     summary: Delete a process order
 *     tags: [Process Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The UUID of the process order to delete
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Successfully deleted the process order (no content returned).
 *       404:
 *         description: Process order not found.
 *       500:
 *         description: Server error while deleting the process order.
 */
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const result = await deleteProcessOrder(id);

      if (!result) {
        return res
          .status(404)
          .json({ message: `Process order with ID ${id} not found` });
      }

      // HTTP 204 means "No Content"
      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting process order:", error);
      return res.status(500).json({
        message: `Error deleting process order with ID ${id}: ${error.message}`,
      });
    }
  })
);

/**
 * Filters process orders in memory based on status (REL) and optionally machine ID.
 * For large datasets, consider filtering at the DB level for better performance.
 *
 * @param {Array} orders - The array of process orders to filter.
 * @param {boolean} mark - If true, filters orders with status "REL"; otherwise, filters orders without "REL".
 * @param {string} [machineId] - Optional machine ID to further filter the orders.
 * @returns {Array} - The filtered array of process orders.
 */
function filterProcessOrders(orders, mark, machineId) {
  const filteredByStatus = orders.filter((order) => {
    const status = order.processorderstatus
      ? order.processorderstatus.trim().toUpperCase()
      : "";
    return mark ? status === "REL" : status !== "REL";
  });

  if (machineId) {
    return filteredByStatus.filter((order) => order.workcenter_id === machineId);
  }
  return filteredByStatus;
}

module.exports = router;
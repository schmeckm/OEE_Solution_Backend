const express = require("express");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");

// Importiere die Funktionen aus dem Service
const {
  loadAllProcessOrders,
  loadProcessOrderById,
  createProcessOrder,
  updateProcessOrder,
  deleteProcessOrder,
} = require('../services/processOrderService');

const router = express.Router();

const { dateSettings } = require("../config/config");

// Utility-Funktion für die Datumsformatierung
const formatDate = (date) =>
  date
    ? moment(date).tz(dateSettings.timezone).format(dateSettings.dateFormat)
    : null;

// Zentralisierte Fehlerbehandlungs-Middleware
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
 *               type: object
 *               properties:
 *                 totalItems:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProcessOrder'
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    try {
      let data = await loadAllProcessOrders();

      // Convert any Date objects to UTC ISO strings
      data = data.map((order) => ({
        ...order,
        start_date: formatDate(order.start_date),
        end_date: formatDate(order.end_date),
        actualprocessorderstart: formatDate(order.actualprocessorderstart),
        actualprocessorderend: formatDate(order.actualprocessorderend),
      }));

      // You could optionally handle "no data" with a 404 if desired:
      if (!data || data.length === 0) {
        return res.status(404).json({ message: "No process orders found." });
      }

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
 *         description: If true, filter only process orders with status REL.
 *     responses:
 *       200:
 *         description: A list of process orders with status REL for the specified machine.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProcessOrder'
 */
router.get(
  "/rel",
  asyncHandler(async (req, res) => {
    const mark = req.query.mark === "true";  // Wenn mark=true, dann filtere nach 'REL', andernfalls nach anderen Status
    const machineId = req.query.machineId;

    try {
      let data = await loadAllProcessOrders();  // Lädt alle Prozessaufträge

      if (!data || data.length === 0) {
        return res.status(404).json({ message: "No process orders found." });
      }

      // Filter die Daten anhand der Statusbedingung und der Maschinen-ID
      data = filterProcessOrders(data, mark, machineId);

      // Rückgabe der gesamten Instanz, keine Datenbeschnitt
      const formattedData = formatProcessOrderDates(data);

      res.json(formattedData);  // Gebe die gesamten Daten zurück (mit allen Feldern)
    } catch (error) {
      console.error(`Error fetching process orders: ${error.message}`);
      res.status(500).json({ message: `Error fetching process orders: ${error.message}` });
    }
  })
);

/**
 * Filtert Prozessaufträge nach Status und Maschinen-ID.
 * @param {Array} orders - Die Liste der Prozessaufträge.
 * @param {boolean} mark - Wenn mark=true, nach "REL" filtern, sonst nach anderen Status.
 * @param {string} [machineId] - Die Maschinen-ID, nach der optional gefiltert wird.
 * @returns {Array} - Die gefilterte Liste der Prozessaufträge.
 */
/**
 * Filters process orders based on status and optionally by machine ID.
 *
 * @param {Array} orders - The array of process orders to filter.
 * @param {boolean} mark - If true, filters orders with status 'REL'. If false, filters orders with status other than 'REL'.
 * @param {string} [machineId] - Optional machine ID to further filter the orders.
 * @returns {Array} - The filtered array of process orders.
 */
function filterProcessOrders(orders, mark, machineId) {
  // Filtert nach Status 'REL' oder anderen Status, basierend auf dem Wert von 'mark'
  const filteredByStatus = orders.filter((order) => {
    const status = order.processorderstatus ? order.processorderstatus.trim().toUpperCase() : "";
    return mark ? status === "REL" : status !== "REL";
  });

  // Wenn eine Maschinen-ID angegeben ist, filtert auch danach
  if (machineId) {
    return filteredByStatus.filter((order) => order.workcenter_id === machineId);
  }

  return filteredByStatus;
}

/**
 * Formatiert Datumsfelder für Prozessaufträge.
 * @param {Array} orders - Die Liste der Prozessaufträge.
 * @returns {Array} - Die Liste der Prozessaufträge mit formatierten Datumswerten.
 */
function formatProcessOrderDates(orders) {
  return orders.map((order) => ({
    ...order,  // Gebe die gesamte Instanz zurück
    start_date: formatDate(order.start_date),
    end_date: formatDate(order.end_date),
    actualprocessorderstart: formatDate(order.actualprocessorderstart),
    actualprocessorderend: formatDate(order.actualprocessorderend),
  }));
}

/**
 * @swagger
 * /processorders/{id}:
 *   get:
 *     summary: Get a process order by ID
 *     tags: [Process Orders]
 *     description: Retrieve a process order by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The process order UUID (order_id).
 *     responses:
 *       200:
 *         description: The process order with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProcessOrder'
 *       404:
 *         description: Process order not found.
 */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;  // Hole die ID aus den URL-Parametern

    try {
      const processOrder = await loadProcessOrderById(id);

      if (!processOrder) {
        return res.status(404).json({ message: `Process order with ID ${id} not found` });
      }

      // Gebe nur die relevanten Werte zurück
      res.json({
        ...processOrder.dataValues,
        start_date: formatDate(processOrder.dataValues.start_date),
        end_date: formatDate(processOrder.dataValues.end_date),
        actualprocessorderstart: formatDate(processOrder.dataValues.actualprocessorderstart),
        actualprocessorderend: formatDate(processOrder.dataValues.actualprocessorderend),
      });
    } catch (error) {
      console.error(`Error fetching process order with ID ${id}: ${error.message}`);
      res.status(500).json({ message: `Error fetching process order with ID ${id}: ${error.message}` });
    }
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
 *                 order_id:
 *                   type: string
 *       500:
 *         description: Error creating process order
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
    const newData = {
      ...req.body,
      order_id: uuidv4(),
      start_date: formatDate(req.body.start_date),
      end_date: formatDate(req.body.end_date),
      actualprocessorderstart: formatDate(req.body.actualprocessorderstart),
      actualprocessorderend: formatDate(req.body.actualprocessorderend),
    };

    try {
      const createdOrder = await createProcessOrder(newData);

      res.status(201).json({
        message: "Process order added successfully",
        order_id: createdOrder.order_id,
      });
    } catch (error) {
      res.status(500).json({ message: `Error creating process order: ${error.message}` });
    }
  })
);

/**
 * @swagger
 * /processorders/{id}:
 *   put:
 *     summary: Update an existing process order
 *     tags: [Process Orders]
 *     description: Update an existing process order by ID.
 *     parameters:
 *       - name: id
 *         in: path
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
 *         description: Process order updated successfully.
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
 *         description: Failed to update process order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updatedData = {
      ...req.body,
      start_date: formatDate(req.body.start_date),
      end_date: formatDate(req.body.end_date),
      actualprocessorderstart: formatDate(req.body.actualprocessorderstart),
      actualprocessorderend: formatDate(req.body.actualprocessorderend),
    };

    try {
      const updatedOrder = await updateProcessOrder(id, updatedData);

      res.status(200).json({
        message: "Process order updated successfully",
        order_id: updatedOrder.order_id,
      });
    } catch (error) {
      errorLogger.error(`Failed to update process order with ID ${id}: ${error.message}`);
      res.status(500).json({ message: "Failed to update process order" });
    }
  })
);

/**
 * @swagger
 * /processorders/{id}:
 *   delete:
 *     summary: Delete a process order
 *     tags: [Process Orders]
 *     description: Delete a process order by ID.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The UUID of the process order to delete
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Process order deleted successfully.
 *       404:
 *         description: Process order not found.
 *       500:
 *         description: Failed to delete process order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      const result = await deleteProcessOrder(id);

      if (!result) {
        return res.status(404).json({ message: `Process order with ID ${id} not found` });
      }

      res.status(204).send();  // 204 bedeutet "Erfolgreiches Löschen ohne Rückgabewerte"
    } catch (error) {
      console.error(`Error deleting process order with ID ${id}: ${error.message}`);
      res.status(500).json({ message: `Error deleting process order with ID ${id}: ${error.message}` });
    }
  })
);

module.exports = router;
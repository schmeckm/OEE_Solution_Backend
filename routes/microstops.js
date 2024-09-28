const express = require("express");
const {
  loadMicroStops,
  saveMicroStops,
} = require("../services/microstopService");
const moment = require("moment"); // Import moment

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Microstops
 *   description: API for managing microstops
 */

/**
 * @swagger
 * /microstops:
 *   get:
 *     summary: Get all microstops
 *     tags: [Microstops]
 *     description: Retrieve a list of all microstops.
 *     responses:
 *       200:
 *         description: A list of microstops.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/", (req, res) => {
  const data = loadMicroStops();
  res.json(data);
});

/**
 * @swagger
 * /microstops/{id}:
 *   get:
 *     summary: Get a specific microstop
 *     tags: [Microstops]
 *     description: Retrieve a single microstop by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The microstop ID.
 *     responses:
 *       200:
 *         description: A microstop object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Microstop not found.
 */
router.get("/:id", (req, res) => {
  const data = loadMicroStops();
  const microStop = data.find((d) => d.ID === req.params.id);
  if (microStop) {
    res.json(microStop);
  } else {
    res.status(404).json({ message: "Microstop not found" });
  }
});

/**
 * @swagger
 * /microstops:
 *   post:
 *     summary: Add a new microstop
 *     tags: [Microstops]
 *     description: Create a new microstop.
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
 *               Start:
 *                 type: string
 *                 format: date-time
 *               End:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Microstop added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 microstop:
 *                   type: object
 */
router.post("/", (req, res) => {
  const data = loadMicroStops();
  const newData = {
    ...req.body,
    Start: req.body.Start
      ? moment(req.body.Start).format("YYYY-MM-DDTHH:mm:ss")
      : null,
    End: req.body.End
      ? moment(req.body.End).format("YYYY-MM-DDTHH:mm:ss")
      : null,
  };
  data.push(newData);
  saveMicroStops(data);
  res
    .status(201)
    .json({ message: "Microstop added successfully", microstop: newData });
});

/**
 * @swagger
 * /microstops/{id}:
 *   put:
 *     summary: Update an existing microstop
 *     tags: [Microstops]
 *     description: Update the details of an existing microstop.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The microstop ID.
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
 *         description: Microstop updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 microstop:
 *                   type: object
 *       404:
 *         description: Microstop not found.
 */
router.put("/:id", (req, res) => {
  const data = loadMicroStops();
  const index = data.findIndex((item) => item.ID === req.params.id);
  if (index !== -1) {
    const updatedData = {
      ...data[index],
      ...req.body,
      Start: req.body.Start
        ? moment(req.body.Start).format("YYYY-MM-DDTHH:mm:ss")
        : data[index].Start,
      End: req.body.End
        ? moment(req.body.End).format("YYYY-MM-DDTHH:mm:ss")
        : data[index].End,
    };
    data[index] = updatedData;
    saveMicroStops(data);
    res
      .status(200)
      .json({
        message: "Microstop updated successfully",
        microstop: updatedData,
      });
  } else {
    res.status(404).json({ message: "Microstop not found" });
  }
});

/**
 * @swagger
 * /microstops/{id}:
 *   delete:
 *     summary: Delete a microstop
 *     tags: [Microstops]
 *     description: Remove a microstop from the list.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The microstop ID.
 *     responses:
 *       200:
 *         description: Microstop deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Microstop not found.
 */
router.delete("/:id", (req, res) => {
  let data = loadMicroStops();
  const initialLength = data.length;
  data = data.filter((item) => item.ID !== req.params.id);
  if (data.length !== initialLength) {
    saveMicroStops(data);
    res.status(200).json({ message: "Microstop deleted successfully" });
  } else {
    res.status(404).json({ message: "Microstop not found" });
  }
});

module.exports = router;

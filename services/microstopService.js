const { Microstop } = require('../models'); // Sequelize-Modell "Microstop"
const moment = require('moment-timezone');
const { dateSettings } = require("../config/config"); // Enthält z. B. { timezone, dateFormat }

/**
 * @swagger
 * components:
 *   schemas:
 *     Microstop:
 *       type: object
 *       required:
 *         - id
 *         - start_date
 *         - end_date
 *       properties:
 *         id:
 *           type: string
 *           description: The unique identifier for the microstop.
 *         start_date:
 *           type: string
 *           format: date-time
 *           description: The start time of the microstop in UTC format.
 *         end_date:
 *           type: string
 *           format: date-time
 *           description: The end time of the microstop in UTC format.
 *         differenz:
 *           type: integer
 *           description: Duration in minutes between start and end time.
 */

/**
 * @swagger
 * tags:
 *   name: Microstop
 *   description: Management of microstops
 */

// Hilfsfunktion: Datumsfelder ins gewünschte Ausgabeformat (UTC-String) konvertieren
function formatDatesForResponse(microstop) {
  if (!microstop) return null;
  const { dateFormat } = dateSettings;
  return {
    ...microstop,
    start_date: microstop.start_date ? moment.utc(microstop.start_date).format(dateFormat) : null,
    end_date: microstop.end_date ? moment.utc(microstop.end_date).format(dateFormat) : null,
  };
}

// Hilfsfunktion: Datumsfelder in UTC-Objekte für DB-Speicherung
function parseDatesForDB(microstop) {
  if (!microstop) return null;
  return {
    ...microstop,
    start_date: microstop.start_date ? moment.utc(microstop.start_date).toDate() : null,
    end_date: microstop.end_date ? moment.utc(microstop.end_date).toDate() : null,
  };
}

// Fehlerbehandlung
function handleError(action, error) {
  console.error(`Error ${action}: ${error.message}`);
  throw new Error(`Failed to ${action} microstop: ${error.message}`);
}

/**
 * @swagger
 * /microstops:
 *   get:
 *     summary: Retrieve a list of all microstops
 *     tags: [Microstop]
 *     responses:
 *       200:
 *         description: A list of microstops.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Microstop'
 */
async function loadMicrostops() {
  try {
    const data = await Microstop.findAll();
    if (!data || data.length === 0) {
      return [];
    }
    return data.map(record => formatDatesForResponse(record.get()));
  } catch (error) {
    handleError('load all', error);
  }
}

/**
 * @swagger
 * /microstops/{id}:
 *   get:
 *     summary: Retrieve a microstop by its ID
 *     tags: [Microstop]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the microstop to retrieve.
 *     responses:
 *       200:
 *         description: Details of a microstop.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Microstop'
 *       404:
 *         description: Microstop not found.
 */
async function loadMicrostopById(id) {
  try {
    const microstop = await Microstop.findByPk(id);
    if (!microstop) {
      console.log(`No microstop found with ID ${id}.`);
      return null;
    }
    return formatDatesForResponse(microstop.get());
  } catch (error) {
    handleError('load by ID', error);
  }
}

/**
 * @swagger
 * /microstops:
 *   post:
 *     summary: Create a new microstop
 *     tags: [Microstop]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Microstop'
 *     responses:
 *       201:
 *         description: Microstop created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Microstop'
 *       400:
 *         description: Invalid input.
 */
async function createMicrostop(data) {
  try {
    const formattedData = parseDatesForDB(data);
    const newMicrostop = await Microstop.create(formattedData);
    return formatDatesForResponse(newMicrostop.get());
  } catch (error) {
    handleError('create', error);
  }
}

/**
 * @swagger
 * /microstops/{id}:
 *   put:
 *     summary: Update a microstop
 *     tags: [Microstop]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the microstop to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Microstop'
 *     responses:
 *       200:
 *         description: Microstop updated successfully.
 *       404:
 *         description: Microstop not found.
 *       400:
 *         description: Invalid input.
 */
async function updateMicrostop(id, data) {
  try {
    const microstop = await Microstop.findByPk(id);
    if (!microstop) {
      throw new Error('Microstop not found');
    }
    const formattedData = parseDatesForDB(data);
    await microstop.update(formattedData);
    return formatDatesForResponse(microstop.get());
  } catch (error) {
    handleError('update', error);
  }
}

/**
 * @swagger
 * /microstops/{id}:
 *   delete:
 *     summary: Delete a microstop
 *     tags: [Microstop]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the microstop to delete.
 *     responses:
 *       204:
 *         description: Microstop deleted successfully.
 *       404:
 *         description: Microstop not found.
 */
async function deleteMicrostop(id) {
  try {
    const microstop = await Microstop.findByPk(id);
    if (!microstop) {
      throw new Error(`Microstop not found for ID ${id}`);
    }
    await microstop.destroy();
    return true;
  } catch (error) {
    handleError('delete', error);
  }
}



module.exports = {
  createMicrostop,
  updateMicrostop,
  loadMicrostops,
  loadMicrostopById,
  deleteMicrostop
};

const { Microstop } = require('../models'); // Import the Microstop model
const moment = require('moment-timezone'); // Use Moment.js for date calculations
const { dateSettings } = require("../config/config"); // Import dateSettings (timezone and format)

// Helper function to format date fields after loading
const formatDates = (microstop) => {
  const { timezone, dateFormat } = dateSettings;
  return {
    ...microstop,
    Start: moment(microstop.Start).tz(timezone).format(dateFormat),
    End: moment(microstop.End).tz(timezone).format(dateFormat),
  };
};

// Helper function to format date fields before saving
const formatDatesBeforeSave = (microstop) => {
  const { timezone } = dateSettings;
  return {
    ...microstop,
    Start: moment.tz(microstop.Start, timezone).utc().toDate(),
    End: moment.tz(microstop.End, timezone).utc().toDate(),
  };
};

// General error handler
const handleError = (action, error) => {
  console.error(`Error ${action}: ${error.message}`);
  throw new Error(`Failed to ${action} microstop: ${error.message}`);
};

/**
 * Creates a new microstop record.
 * @param {Object} data - The data for the new microstop record.
 * @returns {Promise<Object>} The created microstop record.
 */
const createMicrostop = async (data) => {
  try {
    const formattedData = formatDatesBeforeSave(data);
    const newMicrostop = await Microstop.create(formattedData);
    return formatDates(newMicrostop.get()); // Format and return the created microstop
  } catch (error) {
    handleError('create', error);
  }
};

/**
 * Updates an existing microstop record.
 * @param {string} id - The UUID of the microstop to update.
 * @param {Object} data - The updated data.
 * @returns {Promise<Object>} The updated microstop record.
 */
const updateMicrostop = async (id, data) => {
  try {
    const microstop = await Microstop.findByPk(id);
    if (!microstop) throw new Error('Microstop not found');

    // Format date fields before update
    const formattedData = formatDatesBeforeSave(data);

    if (formattedData.End) {
      const start = moment(microstop.Start); // The original start date of the microstop
      const end = moment(formattedData.End); // The new end date being set in the update
      formattedData.Differenz = end.diff(start, 'minutes'); // Calculate the difference in minutes
    }

    await microstop.update(formattedData);
    return formatDates(microstop); // Return the updated microstop after formatting
  } catch (error) {
    handleError('update', error);
  }
};

/**
 * Fetches all microstop records.
 * @returns {Promise<Array>} A list of microstop records.
 */
const loadMicrostops = async () => {
  try {
    const data = await Microstop.findAll(); // Fetch all microstop records from the DB
    if (!data || data.length === 0) {
      return [];
    }
    // Extract and format the dataValues of each record before returning
    return data.map(record => formatDates(record.dataValues));
  } catch (error) {
    handleError('load all', error);
  }
};

/**
 * Fetches a microstop record by ID.
 * @param {string} id - The UUID of the microstop.
 * @returns {Promise<Object|null>} The microstop record or null if not found.
 */
const loadMicrostopById = async (id) => {
  try {
    const microstop = await Microstop.findByPk(id);
    if (!microstop) {
      console.log(`No microstop found with ID ${id}.`);
      return null;
    }
    return formatDates(microstop); // Return the formatted microstop
  } catch (error) {
    handleError(`load by ID ${id}`, error);
  }
};

/**
 * Deletes a microstop record.
 * @param {string} id - The UUID of the microstop to delete.
 * @returns {Promise<boolean>} True if the microstop was successfully deleted.
 */
const deleteMicrostop = async (id) => {
  try {
    const microstop = await Microstop.findByPk(id);
    if (!microstop) throw new Error('Microstop not found');

    await microstop.destroy();
    return true; // Return true if the microstop was successfully deleted
  } catch (error) {
    handleError('delete', error);
  }
};

module.exports = {
  createMicrostop,
  updateMicrostop,
  loadMicrostops,
  loadMicrostopById,
  deleteMicrostop
};

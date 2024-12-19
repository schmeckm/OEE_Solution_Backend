const { UnplannedDowntime } = require('../models'); // Import the UnplannedDowntime model
const moment = require("moment-timezone");
const { dateSettings } = require("../config/config"); // Import timezone and date format from config

// Helper function to format date fields after loading
const formatDates = (unplannedDowntime) => {
  const { dateFormat, timezone } = dateSettings;
  return {
    ...unplannedDowntime,
    Start: moment(unplannedDowntime.Start).tz(timezone).format(dateFormat), // Format the start date with timezone
    End: moment(unplannedDowntime.End).tz(timezone).format(dateFormat),     // Format the end date with timezone
  };
};

// Helper function to format date fields before saving to the database
const formatDatesBeforeSave = (unplannedDowntime) => {
  const { timezone } = dateSettings;
  return {
    ...unplannedDowntime,
    Start: moment.tz(unplannedDowntime.Start, timezone).utc().toDate(), // Convert to UTC before saving
    End: moment.tz(unplannedDowntime.End, timezone).utc().toDate(),     // Convert to UTC before saving
  };
};

// General error handler
const handleError = (action, error) => {
  console.error(`Error ${action}: ${error.message}`);
  throw new Error(`Failed to ${action} unplanned downtime: ${error.message}`);
};

/**
 * Fetches all unplanned downtimes.
 * @returns {Promise<Array>} A list of unplanned downtimes.
 */
const loadUnplannedDowntime = async () => {
  try {
    const data = await UnplannedDowntime.findAll(); // Fetch all unplanned downtimes from the DB
    if (!data || data.length === 0) {
      return [];
    }
    return data;
  } catch (error) {
    handleError('load all', error);
  }
};

/**
 * Fetches an unplanned downtime by ID.
 * @param {string} id - The UUID of the unplanned downtime.
 * @returns {Promise<Object|null>} The unplanned downtime or null if not found.
 */
const loadUnplannedDowntimeById = async (id) => {
  try {
    const unplannedDowntime = await UnplannedDowntime.findOne({ where: { plannedOrder_ID: id } });
    if (!unplannedDowntime) {
      console.log(`No unplanned downtime found with ID ${id}.`);
      return null;
    }
    return unplannedDowntime;
  } catch (error) {
    handleError(`load by ID ${id}`, error);
  }
};

/**
 * Creates a new unplanned downtime.
 * @param {Object} data - The data for the new unplanned downtime.
 * @returns {Promise<Object>} The created unplanned downtime.
 */
const createUnplannedDowntime = async (data) => {
  try {
    const formattedData = formatDatesBeforeSave(data); // Format the dates before saving
    const unplannedDowntime = await UnplannedDowntime.create(formattedData);
    return formatDates(unplannedDowntime.get()); // Format the dates after saving and return
  } catch (error) {
    handleError('create', error);
  }
};

/**
 * Updates an existing unplanned downtime.
 * @param {string} id - The UUID of the unplanned downtime to update.
 * @param {Object} data - The updated data.
 * @returns {Promise<Object>} The updated unplanned downtime.
 */
const updateUnplannedDowntime = async (id, data) => {
  try {
    const unplannedDowntime = await UnplannedDowntime.findByPk(id);
    if (!unplannedDowntime) throw new Error('Unplanned downtime not found');

    const updatedDowntime = await unplannedDowntime.update(data);
    return formatDates(updatedDowntime.get()); // Format the dates after updating and return
  } catch (error) {
    handleError(`update with ID ${id}`, error);
  }
};

/**
 * Deletes an unplanned downtime.
 * @param {string} id - The UUID of the unplanned downtime to delete.
 * @returns {Promise<boolean>} True if the unplanned downtime was successfully deleted.
 */
const deleteUnplannedDowntime = async (id) => {
  try {
    const downtime = await UnplannedDowntime.findOne({ where: { plannedOrder_ID: id } });
    if (!downtime) throw new Error(`Unplanned downtime with ID ${id} not found`);

    await downtime.destroy();
    return true; // Return true if the unplanned downtime was successfully deleted
  } catch (error) {
    handleError(`delete with ID ${id}`, error);
  }
};

module.exports = {
  loadUnplannedDowntime,
  loadUnplannedDowntimeById,
  createUnplannedDowntime,
  updateUnplannedDowntime,
  deleteUnplannedDowntime,
};

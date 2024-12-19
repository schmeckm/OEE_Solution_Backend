const { PlannedDowntime } = require('../models'); // Import the PlannedDowntime model
const moment = require("moment-timezone");
const { dateSettings } = require("../config/config"); // Import timezone and date format from config

// Helper function to format date fields after loading
const formatDates = (plannedDowntime) => {
  const { dateFormat, timezone } = dateSettings;
  return {
    ...plannedDowntime,
    Start: moment(plannedDowntime.Start).tz(timezone).format(dateFormat), // Format the start date with timezone
    End: moment(plannedDowntime.End).tz(timezone).format(dateFormat),     // Format the end date with timezone
  };
};

// Helper function to format date fields before saving to the database
const formatDatesBeforeSave = (plannedDowntime) => {
  const { timezone } = dateSettings;
  return {
    ...plannedDowntime,
    Start: moment.tz(plannedDowntime.Start, timezone).utc().toDate(), // Convert to UTC before saving
    End: moment.tz(plannedDowntime.End, timezone).utc().toDate(),     // Convert to UTC before saving
  };
};

// General error handler
const handleError = (action, error) => {
  console.error(`Error ${action}: ${error.message}`);
  throw new Error(`Failed to ${action} planned downtime: ${error.message}`);
};

/**
 * Fetches all planned downtimes.
 * @returns {Promise<Array>} A list of planned downtimes.
 */
const loadPlannedDowntime = async () => {
  try {
    const data = await PlannedDowntime.findAll(); // Fetch all planned downtimes from the DB
    if (!data || data.length === 0) {
      return [];
    }
    return data;
  } catch (error) {
    handleError('load all', error);
  }
};

/**
 * Fetches a planned downtime by ID.
 * @param {string} id - The UUID of the planned downtime.
 * @returns {Promise<Object|null>} The planned downtime or null if not found.
 */
const loadPlannedDowntimeById = async (id) => {
  try {
    const plannedDowntime = await PlannedDowntime.findOne({ where: { plannedOrder_ID: id } });
    if (!plannedDowntime) {
      console.log(`No planned downtime found with ID ${id}.`);
      return null;
    }
    return plannedDowntime;
  } catch (error) {
    handleError(`load by ID ${id}`, error);
  }
};

/**
 * Creates a new planned downtime.
 * @param {Object} data - The data for the new planned downtime.
 * @returns {Promise<Object>} The created planned downtime.
 */
const createPlannedDowntime = async (data) => {
  try {
    const formattedData = formatDatesBeforeSave(data); // Format the dates before saving
    const plannedDowntime = await PlannedDowntime.create(formattedData);
    return formatDates(plannedDowntime.get()); // Format the dates after saving and return
  } catch (error) {
    handleError('create', error);
  }
};

/**
 * Updates an existing planned downtime.
 * @param {string} id - The UUID of the planned downtime to update.
 * @param {Object} data - The updated data.
 * @returns {Promise<Object>} The updated planned downtime.
 */
const updatePlannedDowntime = async (id, data) => {
  try {
    const plannedDowntime = await PlannedDowntime.findByPk(id);
    if (!plannedDowntime) throw new Error('Planned downtime not found');

    const updatedDowntime = await plannedDowntime.update(data);
    return formatDates(updatedDowntime.get()); // Format the dates after updating and return
  } catch (error) {
    handleError(`update with ID ${id}`, error);
  }
};

/**
 * Deletes a planned downtime.
 * @param {string} id - The UUID of the planned downtime to delete.
 * @returns {Promise<boolean>} True if the planned downtime was successfully deleted.
 */
const deletePlannedDowntime = async (id) => {
  try {
    const downtime = await PlannedDowntime.findOne({ where: { plannedOrder_ID: id } });
    if (!downtime) throw new Error(`Planned downtime with ID ${id} not found`);

    await downtime.destroy();
    return true; // Return true if the planned downtime was successfully deleted
  } catch (error) {
    handleError(`delete with ID ${id}`, error);
  }
};

module.exports = {
  loadPlannedDowntime,
  loadPlannedDowntimeById,
  createPlannedDowntime,
  updatePlannedDowntime,
  deletePlannedDowntime,
};

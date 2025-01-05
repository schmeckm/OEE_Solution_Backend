const { PlannedDowntime } = require('../models'); // Import the PlannedDowntime model
const moment = require("moment-timezone");
const { dateSettings } = require("../config/config"); // Import timezone and date format from config

/**
 * Standardformat (ISO 8601) für Datumsangaben in UTC.
 * Sie können dieses Format bei Bedarf über eine ENV-Variable oder direkt hier anpassen.
 * Beispiel: YYYY-MM-DDTHH:mm:ss[Z] = 2025-01-02T13:00:00Z
 */
const DATE_FORMAT = process.env.DATE_FORMAT || "YYYY-MM-DDTHH:mm:ss[Z]";

/**
 * Konvertiert ein beliebiges Datum (Date-Objekt oder String) in einen ISO-8601-String in UTC.
 * - Falls kein Datum vorhanden, gibt es `null` zurück.
 */
function formatDateToUTC(date) {
  if (!date) return null;
  // moment.utc(...) sorgt dafür, dass wir den Wert als UTC behandeln
  return moment.utc(date).format(DATE_FORMAT);
}

/**
 * Konvertiert ein Datum (String oder Date) in ein reines UTC-Date-Objekt (für Speichern in DB).
 * - Falls kein Datum vorhanden, gibt es `null` zurück.
 */
function parseDateAsUTC(date) {
  if (!date) return null;
  return moment.utc(date).toDate();
}

/**
 * Formatiert ein einzelnes Planned-Downtime-Objekt so, dass alle Zeitfelder (z. B. Start, End, usw.)
 * als UTC-Strings ausgegeben werden.
 */
function formatDatesForResponse(plannedDowntime) {
  if (!plannedDowntime) return null;
  return {
    ...plannedDowntime,
    Start: formatDateToUTC(plannedDowntime.Start),
    End: formatDateToUTC(plannedDowntime.End),
  };
}

/**
 * Konvertiert ein Planned-Downtime-Objekt so, dass alle Zeitfelder als Date-Objekte in UTC
 * vorliegen, bevor sie in der DB gespeichert werden (z. B. über Sequelize/Repository).
 */
function parseDatesForDB(plannedDowntime) {
  if (!plannedDowntime) return null;
  return {
    ...plannedDowntime,
    Start: parseDateAsUTC(plannedDowntime.Start),
    End: parseDateAsUTC(plannedDowntime.End),
  };
}

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
    return data.map(formatDatesForResponse); // Format the dates after loading
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
    return formatDatesForResponse(plannedDowntime); // Format the dates after loading
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
    const formattedData = parseDatesForDB(data); // Format the dates before saving
    const plannedDowntime = await PlannedDowntime.create(formattedData);
    return formatDatesForResponse(plannedDowntime.get()); // Format the dates after saving and return
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

    const formattedData = parseDatesForDB(data); // Format the dates before updating
    const updatedDowntime = await plannedDowntime.update(formattedData);
    return formatDatesForResponse(updatedDowntime.get()); // Format the dates after updating and return
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
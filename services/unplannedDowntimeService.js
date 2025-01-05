// controllers/unplannedDowntime.controller.js
const { UnplannedDowntime } = require("../models");
const {
  parseDateAsUTC,
  formatDateToUTCString,
} = require("../utils/dateUtils");

// Hilfsfunktionen: Speziell auf Felder "Start" und "End" zugeschnitten
function parseUnplannedDowntimeForDB(unplannedDowntime) {
  if (!unplannedDowntime) return null;

  return {
    ...unplannedDowntime,
    Start: parseDateAsUTC(unplannedDowntime.Start),
    End: parseDateAsUTC(unplannedDowntime.End),
  };
}

function formatUnplannedDowntimeResponse(unplannedDowntime) {
  if (!unplannedDowntime) return null;

  return {
    ...unplannedDowntime,
    Start: formatDateToUTCString(unplannedDowntime.Start),
    End: formatDateToUTCString(unplannedDowntime.End),
  };
}

// CREATE
async function createUnplannedDowntime(data) {
  try {
    const formattedData = parseUnplannedDowntimeForDB(data);
    const newDowntime = await UnplannedDowntime.create(formattedData);
    return formatUnplannedDowntimeResponse(newDowntime.get());
  } catch (error) {
    console.error("Error creating UnplannedDowntime:", error);
    throw error;
  }
}

// READ (alle)
async function loadUnplannedDowntime() {
  try {
    const data = await UnplannedDowntime.findAll();
    return data.map((item) => formatUnplannedDowntimeResponse(item.get()));
  } catch (error) {
    console.error("Error loading UnplannedDowntime:", error);
    throw error;
  }
}

// READ (einzelner Datensatz anhand ID)
async function loadUnplannedDowntimeById(id) {
  try {
    const downtime = await UnplannedDowntime.findByPk(id);
    if (!downtime) return null;

    return formatUnplannedDowntimeResponse(downtime.get());
  } catch (error) {
    console.error(`Error loading UnplannedDowntime with ID ${id}:`, error);
    throw error;
  }
}

// UPDATE
async function updateUnplannedDowntime(id, data) {
  try {
    const downtime = await UnplannedDowntime.findByPk(id);
    if (!downtime) {
      throw new Error(`UnplannedDowntime with ID ${id} not found`);
    }

    const formattedData = parseUnplannedDowntimeForDB(data);
    await downtime.update(formattedData);

    return formatUnplannedDowntimeResponse(downtime.get());
  } catch (error) {
    console.error(`Error updating UnplannedDowntime with ID ${id}:`, error);
    throw error;
  }
}

// DELETE
async function deleteUnplannedDowntime(id) {
  try {
    const downtime = await UnplannedDowntime.findByPk(id);
    if (!downtime) {
      throw new Error(`UnplannedDowntime with ID ${id} not found`);
    }

    await downtime.destroy();
    return true;
  } catch (error) {
    console.error(`Error deleting UnplannedDowntime with ID ${id}:`, error);
    throw error;
  }
}

module.exports = {
  createUnplannedDowntime,
  loadUnplannedDowntime,
  loadUnplannedDowntimeById,
  updateUnplannedDowntime,
  deleteUnplannedDowntime,
};

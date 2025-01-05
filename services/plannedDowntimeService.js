// controllers/plannedDowntime.controller.js
const { PlannedDowntime } = require("../models"); // Dein Sequelize-Modell
const {
  parseDateAsUTC,
  formatDateToUTCString,
} = require("../utils/dateUtils");

// 1) Hilfsfunktion: Daten parsen, damit sie als UTC-Date in der DB gespeichert werden.
function parsePlannedDowntimeForDB(plannedDowntime) {
  if (!plannedDowntime) return null;

  return {
    ...plannedDowntime,
    start_date: parseDateAsUTC(plannedDowntime.start_date),
    end_date: parseDateAsUTC(plannedDowntime.end_date),
  };
}

// 2) Hilfsfunktion: Daten formatieren, damit sie als UTC-String in der API-Response landen.
function formatPlannedDowntimeResponse(plannedDowntime) {
  if (!plannedDowntime) return null;

  return {
    ...plannedDowntime,
    start_date: formatDateToUTCString(plannedDowntime.start_date),
    end_date: formatDateToUTCString(plannedDowntime.end_date),
  };
}

// 3) CREATE
async function createPlannedDowntime(data) {
  try {
    // Vor dem Speichern in der DB: parse in UTC-Date-Objekte
    const formattedData = parsePlannedDowntimeForDB(data);

    // Erstelle den neuen Eintrag
    const newDowntime = await PlannedDowntime.create(formattedData);

    // Nach dem Speichern: Daten aus DB holen und in UTC-Strings formatieren
    return formatPlannedDowntimeResponse(newDowntime.get());
  } catch (error) {
    console.error("Error creating PlannedDowntime:", error);
    throw error;
  }
}

// 4) READ (alle)
async function loadPlannedDowntime() {
  try {
    const data = await PlannedDowntime.findAll();

    // Daten per map in UTC-Strings umwandeln
    return data.map((item) => formatPlannedDowntimeResponse(item.get()));
  } catch (error) {
    console.error("Error loading PlannedDowntime:", error);
    throw error;
  }
}

// 5) READ (einzelner Datensatz anhand ID)
async function loadPlannedDowntimeById(id) {
  try {
    const downtime = await PlannedDowntime.findByPk(id);
    if (!downtime) return null;

    return formatPlannedDowntimeResponse(downtime.get());
  } catch (error) {
    console.error(`Error loading PlannedDowntime with ID ${id}:`, error);
    throw error;
  }
}

// 6) UPDATE
async function updatePlannedDowntime(id, data) {
  try {
    const downtime = await PlannedDowntime.findByPk(id);
    if (!downtime) {
      throw new Error(`PlannedDowntime with ID ${id} not found`);
    }

    // Neue Daten zuerst als UTC-Date-Objekte parsen
    const formattedData = parsePlannedDowntimeForDB(data);

    // Dann updaten
    await downtime.update(formattedData);

    // Rückgabe wieder als UTC-Strings
    return formatPlannedDowntimeResponse(downtime.get());
  } catch (error) {
    console.error(`Error updating PlannedDowntime with ID ${id}:`, error);
    throw error;
  }
}

// 7) DELETE
async function deletePlannedDowntime(id) {
  try {
    const downtime = await PlannedDowntime.findByPk(id);
    if (!downtime) {
      throw new Error(`PlannedDowntime with ID ${id} not found`);
    }

    await downtime.destroy();
    return true;
  } catch (error) {
    console.error(`Error deleting PlannedDowntime with ID ${id}:`, error);
    throw error;
  }
}

// Alle Funktionen exportieren
module.exports = {
  createPlannedDowntime,
  loadPlannedDowntime,
  loadPlannedDowntimeById,
  updatePlannedDowntime,
  deletePlannedDowntime,
};

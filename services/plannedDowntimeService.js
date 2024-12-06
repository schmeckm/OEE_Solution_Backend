const { PlannedDowntime } = require('../models'); // Importiere das PlannedDowntime-Modell
const moment = require("moment-timezone");
const { dateSettings } = require("../config/config");

// Hilfsfunktion zum Formatieren der Datumsfelder nach dem Laden
const formatDates = (plannedDowntime) => {
  const { dateFormat, timezone } = dateSettings;
  return {
    ...plannedDowntime,
    Start: moment(plannedDowntime.Start).tz(timezone).format(dateFormat),
    End: moment(plannedDowntime.End).tz(timezone).format(dateFormat),
  };
};

// Hilfsfunktion zum Formatieren der Datumsfelder vor dem Speichern
const formatDatesBeforeSave = (plannedDowntime) => {
  const { timezone } = dateSettings;
  return {
    ...plannedDowntime,
    Start: moment.tz(plannedDowntime.Start, timezone).utc().toDate(),
    End: moment.tz(plannedDowntime.End, timezone).utc().toDate(),
  };
};

/**
 * Holt alle geplanten Stillstandszeiten.
 * @returns {Promise<Array>} Eine Liste von geplanten Stillstandszeiten.
 */
// loadPlannedDowntime-Funktion
const loadPlannedDowntime = async () => {
  try {
    const data = await PlannedDowntime.findAll();
    if (!data || data.length === 0) {
      console.log("Keine geplanten Stillstandszeiten gefunden.");
      return [];  // Gibt eine leere Liste zurück, falls keine Daten gefunden wurden
    }
    console.log("Geplante Stillstandszeiten gefunden:", data);
    return data;
  } catch (error) {
    console.error("Fehler beim Laden der geplanten Stillstandszeiten:", error.message);
    return [];
  }
};


/**
 * Holt eine geplante Stillstandszeit nach ID.
 * @param {string} id - Die UUID der geplanten Stillstandszeit.
 * @returns {Promise<Object|null>} Die geplante Stillstandszeit oder null, wenn nicht gefunden.
 */
const loadPlannedDowntimeById = async (id) => {
  try {
    // Suche nach der geplanten Stillstandszeit anhand der ID
    const plannedDowntime = await PlannedDowntime.findOne({
      where: {
        plannedOrder_ID: id,  // Das Feld in der Datenbank (UUID)
      },
    });

    if (!plannedDowntime) {
      console.log(`Keine geplante Stillstandszeit mit ID ${id} gefunden.`);
      return null;  // Rückgabe von null, wenn keine Daten gefunden wurden
    }

    // Wenn Daten gefunden wurden, gebe das Ergebnis zurück
    return plannedDowntime;
  } catch (error) {
    console.error(`Fehler beim Abrufen der Stillstandszeit: ${error.message}`);
    throw new Error(`Fehler beim Abrufen der Stillstandszeit mit ID ${id}`);
  }
};



/**
 * Erstellt eine neue geplante Stillstandszeit.
 * @param {Object} data - Die Daten der neuen geplanten Stillstandszeit.
 * @returns {Promise<Object>} Die erstellte geplante Stillstandszeit.
 */
const createPlannedDowntime = async (data) => {
  try {
    const formattedData = formatDatesBeforeSave(data);
    const plannedDowntime = await PlannedDowntime.create(formattedData);
    return formatDates(plannedDowntime.get());
  } catch (error) {
    console.error("Fehler beim Erstellen der geplanten Stillstandszeit:", error.message);
    throw new Error('Failed to create planned downtime');
  }
};

/**
 * Aktualisiert eine bestehende geplante Stillstandszeit.
 * @param {string} id - Die UUID der zu aktualisierenden geplanten Stillstandszeit.
 * @param {Object} data - Die aktualisierten Daten.
 * @returns {Promise<Object>} Die aktualisierte geplante Stillstandszeit.
 */
const updatePlannedDowntime = async (id, data) => {
  try {
    const plannedDowntime = await PlannedDowntime.findByPk(id);
    if (!plannedDowntime) {
      throw new Error('Planned downtime not found');
    }

    const updatedDowntime = await plannedDowntime.update({
      plannedOrder_ID: data.plannedOrder_ID,
      Start: data.Start,
      End: data.End,
      order_id: data.order_id,
      workcenter_id: data.workcenter_id,
      durationInMinutes: data.durationInMinutes,
    });

    return formatDates(updatedDowntime.get());
  } catch (error) {
    console.error(`Fehler beim Aktualisieren der geplanten Stillstandszeit mit ID ${id}:`, error);
    throw new Error(`Failed to update planned downtime with ID ${id}: ${error.message}`);
  }
};

/**
 * Löscht eine geplante Stillstandszeit.
 * @param {string} id - Die UUID der zu löschenden geplanten Stillstandszeit.
 * @returns {Promise<boolean>} True, wenn die geplante Stillstandszeit erfolgreich gelöscht wurde.
 */
const deletePlannedDowntime = async (id) => {
  try {
    // Suche nach geplanten Stillstandszeiten mit der UUID
    const downtime = await PlannedDowntime.findOne({
      where: {
        plannedorder_id: id  // Stellen sicher, dass das richtige Feld verwendet wird
      }
    });

    if (!downtime) {
      throw new Error(`Geplante Stillstandszeit mit ID ${id} nicht gefunden`);
    }

    // Lösche die geplante Stillstandszeit
    await downtime.destroy();
    return true;
  } catch (error) {
    throw new Error(`Fehler beim Löschen der geplanten Stillstandszeit mit ID ${id}: ${error.message}`);
  }
};


module.exports = {
  loadPlannedDowntime,
  loadPlannedDowntimeById,
  createPlannedDowntime,
  updatePlannedDowntime,
  deletePlannedDowntime,
};

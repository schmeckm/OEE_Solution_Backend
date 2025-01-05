const moment = require("moment"); // Wir verwenden hier nur moment, nicht moment-timezone
require('dotenv').config(); // Um ggf. DATE_FORMAT oder andere Umgebungsvariablen zu laden

const processOrderRepository = require('../repositories/ProcessOrderRepository');
const { oeeLogger } = require("../src/header");

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
 * Formatiert ein einzelnes Process-Order-Objekt so, dass alle Zeitfelder (z. B. Start, End, usw.)
 * als UTC-Strings ausgegeben werden.
 */
function formatDatesForResponse(processOrder) {
  if (!processOrder) return null;
  return {
    ...processOrder,
    start_date: formatDateToUTC(processOrder.start_date),
    end_date: formatDateToUTC(processOrder.end_date),
    actualprocessorderstart: formatDateToUTC(processOrder.actualprocessorderstart),
    actualprocessorderend: formatDateToUTC(processOrder.actualprocessorderend),
  };
}

/**
 * Konvertiert ein Process-Order-Objekt so, dass alle Zeitfelder als Date-Objekte in UTC
 * vorliegen, bevor sie in der DB gespeichert werden (z. B. über Sequelize/Repository).
 */
function parseDatesForDB(processOrder) {
  if (!processOrder) return null;
  return {
    ...processOrder,
    start_date: parseDateAsUTC(processOrder.start_date),
    end_date: parseDateAsUTC(processOrder.end_date),
    actualprocessorderstart: parseDateAsUTC(processOrder.actualprocessorderstart),
    actualprocessorderend: parseDateAsUTC(processOrder.actualprocessorderend),
  };
}

/**
 * Lädt alle Process Orders aus der DB und formatiert die Datumsfelder für die Rückgabe (UTC).
 */
async function loadAllProcessOrders() {
  try {
    // 1) Rohdaten aus Repository/DB holen
    const processOrders = await processOrderRepository.getAll();
    return processOrders.map((order) => {
      const data = order.dataValues || order; // Falls es ein reines Objekt ist, kann man das weglassen
      return formatDatesForResponse(data);
    });
  } catch (error) {
    console.error(`Error loading all process orders: ${error.message}`);
    throw error;
  }
}

/**
 * Lädt eine Process Order via ID und formatiert die Datumsfelder für die Rückgabe (UTC).
 */
async function loadProcessOrderById(id) {
  try {
    const processOrder = await processOrderRepository.getById(id);
    if (!processOrder) {
      throw new Error('Process order not found');
    }
    // Formatieren für die Response
    const data = processOrder.dataValues || processOrder;
    return formatDatesForResponse(data);
  } catch (error) {
    console.error(`Error loading process order with ID ${id}: ${error.message}`);
    throw error;
  }
}

/**
 * Erstellt eine neue Process Order in der DB (Daten im UTC-Format).
 */
async function createProcessOrder(processOrderData) {
  try {
    const formattedData = parseDatesForDB(processOrderData); // Datumfelder als UTC-Date-Objekte
    const newOrder = await processOrderRepository.create(formattedData);
    // Nach dem Speichern Felder für Response formatieren
    const data = newOrder.dataValues || newOrder;
    return formatDatesForResponse(data);
  } catch (error) {
    console.error(`Error creating a new process order: ${error.message}`);
    throw error;
  }
}

/**
 * Aktualisiert eine bestehende Process Order (Daten im UTC-Format).
 */
async function updateProcessOrder(id, updatedData) {
  try {
    const formattedData = parseDatesForDB(updatedData);
    const updatedOrder = await processOrderRepository.update(id, formattedData);
    if (!updatedOrder) {
      throw new Error(`Process order with ID ${id} not found`);
    }
    const data = updatedOrder.dataValues || updatedOrder;
    return formatDatesForResponse(data);
  } catch (error) {
    console.error(`Error updating process order with ID ${id}: ${error.message}`);
    throw error;
  }
}

/**
 * Löscht eine Process Order.
 */
async function deleteProcessOrder(id) {
  try {
    return await processOrderRepository.delete(id); // Use repository to delete
  } catch (error) {
    console.error(`Error deleting process order with ID ${id}: ${error.message}`);
    throw error;
  }
}

module.exports = {
  loadAllProcessOrders,
  loadProcessOrderById,
  createProcessOrder,
  updateProcessOrder,
  deleteProcessOrder,
};
// controllers/processOrder.controller.js
const processOrderRepository = require('../repositories/ProcessOrderRepository');
const { oeeLogger } = require("../src/header");

// Importiere die zentralen Hilfsfunktionen
const {
  formatDateToUTCString,  // vormals formatDateToUTC
  parseDateAsUTC,
} = require("../utils/dateUtils");

/**
 * Standardformat (ISO 8601) für Datumsangaben in UTC.
 * (Optional, falls du es hier noch einmal brauchst)
 */
const DATE_FORMAT = process.env.DATE_FORMAT || "YYYY-MM-DDTHH:mm:ss[Z]";

/**
 * Formatiert ein einzelnes Process-Order-Objekt so, 
 * dass alle Zeitfelder (z. B. Start, End, usw.) als UTC-Strings ausgegeben werden.
 */
function formatDatesForResponse(processOrder) {
  if (!processOrder) return null;
  return {
    ...processOrder,
    start_date: formatDateToUTCString(processOrder.start_date),
    end_date: formatDateToUTCString(processOrder.end_date),
    actualprocessorderstart: formatDateToUTCString(processOrder.actualprocessorderstart),
    actualprocessorderend: formatDateToUTCString(processOrder.actualprocessorderend),
  };
}

/**
 * Konvertiert ein Process-Order-Objekt so, dass alle Zeitfelder 
 * als Date-Objekte in UTC vorliegen, bevor sie in der DB gespeichert werden.
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

    // 2) Jede Order in UTC-Strings konvertieren
    return processOrders.map((order) => {
      const data = order.dataValues || order;
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
    // Datumfelder in UTC-Date-Objekte
    const formattedData = parseDatesForDB(processOrderData);

    // Speichere in DB
    const newOrder = await processOrderRepository.create(formattedData);

    // Rückgabe wieder im UTC-String-Format
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
    return await processOrderRepository.delete(id);
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

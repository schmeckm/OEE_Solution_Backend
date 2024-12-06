const { WorkCenter } = require('../models');  // Hier importierst du das Modell

/**
 * Lädt alle Work Centers
 * @returns {Promise<Array>} Eine Liste der Work Centers
 */
const loadWorkCenters = async () => {
  try {
    const workCenters = await WorkCenter.findAll();  // Suche alle Work Centers
    return workCenters;
  } catch (error) {
    console.error("Fehler beim Laden der Work Centers:", error.message);
    throw new Error('Failed to load work centers');
  }
};

/**
 * Lädt ein Work Center nach ID
 * @param {string} id - Die UUID des Work Centers
 * @returns {Promise<Object|null>} Das Work Center oder null, wenn nicht gefunden
 */
const loadWorkCenterById = async (id) => {
  try {
    const workCenter = await WorkCenter.findByPk(id);  // Suche nach Work Center mit der ID
    if (!workCenter) {
      throw new Error(`Work center with ID ${id} not found.`);
    }
    return workCenter;
  } catch (error) {
    console.error(`Fehler beim Laden des Work Centers mit ID ${id}:`, error.message);
    throw new Error(`Failed to load work center with ID ${id}`);
  }
};

/**
 * Erstellt ein neues Work Center
 * @param {Object} data - Die Daten des neuen Work Centers
 * @returns {Promise<Object>} Das erstellte Work Center
 */
const createWorkCenter = async (data) => {
  try {
    const workCenter = await WorkCenter.create(data);  // Erstelle ein neues Work Center
    return workCenter;
  } catch (error) {
    console.error("Fehler beim Erstellen des Work Centers:", error.message);
    throw new Error('Failed to create work center');
  }
};

/**
 * Aktualisiert ein bestehendes Work Center
 * @param {string} id - Die UUID des zu aktualisierenden Work Centers
 * @param {Object} data - Die aktualisierten Daten
 * @returns {Promise<Object>} Das aktualisierte Work Center
 */
const updateWorkCenter = async (id, data) => {
  try {
    const workCenter = await WorkCenter.findByPk(id);  // Suche nach Work Center
    if (!workCenter) {
      throw new Error(`Work center with ID ${id} not found.`);
    }
    await workCenter.update(data);  // Aktualisiere das Work Center
    return workCenter;
  } catch (error) {
    console.error(`Fehler beim Aktualisieren des Work Centers mit ID ${id}:`, error.message);
    throw new Error(`Failed to update work center with ID ${id}`);
  }
};

/**
 * Löscht ein Work Center
 * @param {string} id - Die UUID des zu löschenden Work Centers
 * @returns {Promise<boolean>} True, wenn erfolgreich gelöscht
 */
const deleteWorkCenter = async (id) => {
  try {
    const workCenter = await WorkCenter.findByPk(id);  // Suche nach Work Center
    if (!workCenter) {
      throw new Error(`Work center with ID ${id} not found.`);
    }
    await workCenter.destroy();  // Lösche das Work Center
    return true;
  } catch (error) {
    console.error(`Fehler beim Löschen des Work Centers mit ID ${id}:`, error.message);
    throw new Error(`Failed to delete work center with ID ${id}`);
  }
};

module.exports = {
  loadWorkCenters,
  loadWorkCenterById,
  createWorkCenter,
  updateWorkCenter,
  deleteWorkCenter,
};

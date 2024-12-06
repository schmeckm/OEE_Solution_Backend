const { WorkCenter } = require('../models'); // Importiere das WorkCenter-Modell aus models/index.js

/**
 * Holt alle WorkCenters.
 * @returns {Promise<Array>} Eine Liste von WorkCenters.
 */
const getAll = async () => {
    try {
        // Alle WorkCenter aus der Datenbank abfragen
        return await WorkCenter.findAll();
    } catch (error) {
        throw new Error(`Failed to retrieve work centers: ${error.message}`);
    }
};

/**
 * Holt ein WorkCenter nach ID.
 * @param {string} id - Die UUID des WorkCenters.
 * @returns {Promise<Object|null>} Das WorkCenter oder null, wenn nicht gefunden.
 */
const getById = async (id) => {
    try {
        // WorkCenter mit der gegebenen ID abfragen
        const workCenter = await WorkCenter.findByPk(id);
        if (!workCenter) {
            throw new Error(`Work center with ID ${id} not found.`);
        }
        return workCenter; // Das WorkCenter zurückgeben
    } catch (error) {
        throw new Error(`Error loading work center with ID ${id}: ${error.message}`);
    }
};

/**
 * Erstellt ein neues WorkCenter.
 * @param {Object} data - Die Daten des neuen WorkCenters.
 * @returns {Promise<Object>} Das erstellte WorkCenter.
 */
const create = async (data) => {
    try {
        // Neues WorkCenter mit den übergebenen Daten erstellen
        const workCenter = await WorkCenter.create(data);
        return workCenter;
    } catch (error) {
        console.error("Fehler beim Erstellen des Work Centers:", error.message);
      throw new Error('Failed to create work center');
    }
};

/**
 * Aktualisiert ein bestehendes WorkCenter.
 * @param {string} id - Die UUID des zu aktualisierenden WorkCenters.
 * @param {Object} data - Die aktualisierten Daten.
 * @returns {Promise<Object>} Das aktualisierte WorkCenter.
 */
const update = async (id, data) => {
    try {
        // WorkCenter mit der ID suchen
        const workCenter = await WorkCenter.findByPk(id);
        if (!workCenter) {
            throw new Error('Work center not found');
        }
        // Das WorkCenter mit den neuen Daten aktualisieren
        return await workCenter.update(data);
    } catch (error) {
        throw new Error(`Failed to update work center with ID ${id}: ${error.message}`);
    }
};

/**
 * Löscht ein WorkCenter.
 * @param {string} id - Die UUID des zu löschenden WorkCenters.
 * @returns {Promise<boolean>} True, wenn das WorkCenter erfolgreich gelöscht wurde.
 */
const deleteWorkCenter = async (id) => {
    try {
        const workCenter = await WorkCenter.findByPk(id);
        console.log(workCenter)
        if (!workCenter) {
            throw new Error('Work center not found');
        }
        await workCenter.destroy();
        return true; // Gibt zurück, ob das Löschen erfolgreich war
    } catch (error) {
        throw new Error(`Failed to delete work center with ID ${id}: ${error.message}`);
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: deleteWorkCenter,
};

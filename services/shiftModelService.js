const { v4: uuidv4, validate } = require('uuid');  // Importiere uuid und validate-Funktion
const { ShiftModel } = require('../models');  // Importiere das ShiftModel

/**
 * Retrieves all ShiftModel records from the database.
 * @returns {Promise<Array>} List of all ShiftModel records.
 */
const getAll = async () => {
    try {
        const shiftModels = await ShiftModel.findAll();  // Alle Schichtmodelle aus der Datenbank abrufen
        return shiftModels.map(shiftModel => shiftModel.dataValues);  // Raw-Daten aus den Sequelize-Instanzen extrahieren
    } catch (error) {
        throw new Error(`Failed to retrieve shift models: ${error.message}`);
    }
};

/**
 * Retrieves a single ShiftModel by its ID.
 * @param {string} id - The UUID of the ShiftModel to retrieve.
 * @returns {Promise<Object|null>} The ShiftModel data or null if not found.
 */
const getById = async (id) => {
    try {
        // UUID-Format validieren
        if (!validate(id)) {
            throw new Error(`Invalid UUID format: ${id}`);
        }

        const shiftModel = await ShiftModel.findByPk(id);  // ShiftModel anhand der Primärschlüssel-ID abrufen
        if (!shiftModel) {
            throw new Error(`Shift model with ID ${id} not found.`);
        }
        return shiftModel.dataValues;  // Raw-Daten des ShiftModel zurückgeben
    } catch (error) {
        throw new Error(`Error fetching shift model with ID ${id}: ${error.message}`);
    }
};

/**
 * Creates a new ShiftModel record.
 * @param {Object} data - Data for the new ShiftModel.
 * @returns {Promise<Object>} The created ShiftModel data.
 */
const create = async (data) => {
    try {
        // Validierung der erforderlichen Felder vor der Erstellung
        if (!data.workcenter_id || !data.shift_name || !data.shift_start_time || !data.shift_end_time) {
            throw new Error('Missing required fields: workcenter_id, shift_name, shift_start_time, or shift_end_time.');
        }

        const newShiftModel = await ShiftModel.create(data);  // Neues ShiftModel erstellen
        return newShiftModel.dataValues;  // Raw-Daten des neu erstellten ShiftModels zurückgeben
    } catch (error) {
        throw new Error(`Failed to create shift model: ${error.message}`);
    }
};

/**
 * Updates an existing ShiftModel by its ID.
 * @param {string} id - The UUID of the ShiftModel to update.
 * @param {Object} data - The data to update the ShiftModel with.
 * @returns {Promise<Object>} The updated ShiftModel data.
 */
const update = async (id, data) => {
    try {
        // UUID-Format validieren
        if (!validate(id)) {
            throw new Error(`Invalid UUID format: ${id}`);
        }

        const shiftModel = await ShiftModel.findByPk(id);  // ShiftModel anhand der ID suchen
        if (!shiftModel) {
            throw new Error(`Shift model with ID ${id} not found.`);
        }

        // Optional: Validierung der Zeit vor dem Aktualisieren
        if (data.shift_start_time && data.shift_end_time && data.shift_start_time >= data.shift_end_time) {
            throw new Error('Shift start time must be before shift end time.');
        }

        const updatedShiftModel = await shiftModel.update(data);  // ShiftModel aktualisieren
        return updatedShiftModel.dataValues;  // Raw-Daten des aktualisierten ShiftModels zurückgeben
    } catch (error) {
        throw new Error(`Failed to update shift model with ID ${id}: ${error.message}`);
    }
};

/**
 * Deletes a ShiftModel by its ID.
 * @param {string} id - The UUID of the ShiftModel to delete.
 * @returns {Promise<boolean>} True if deleted successfully, false if not found.
 */
const deleteShiftModel = async (id) => {
    try {
        // UUID-Format validieren
        if (!validate(id)) {
            throw new Error(`Invalid UUID format: ${id}`);
        }

        const shiftModel = await ShiftModel.findByPk(id);  // ShiftModel anhand der ID suchen
        if (!shiftModel) {
            throw new Error(`Shift model with ID ${id} not found.`);
        }

        await shiftModel.destroy();  // ShiftModel löschen
        return true;  // Erfolgreiches Löschen zurückgeben
    } catch (error) {
        throw new Error(`Failed to delete shift model with ID ${id}: ${error.message}`);
    }
};

/**
 * Retrieves ShiftModels by workcenter_id.
 * @param {string} workcenterId - The UUID of the workcenter to search by.
 * @returns {Promise<Array>} List of ShiftModel records associated with the given workcenter_id.
 */
const getByWorkcenterId = async (workcenterId) => {
    try {
        // UUID-Format für workcenter_id validieren
        if (!validate(workcenterId)) {
            throw new Error(`Invalid UUID format for workcenter_id: ${workcenterId}`);
        }

        const shiftModels = await ShiftModel.findAll({
            where: {
                workcenter_id: workcenterId  // Nach workcenter_id filtern
            }
        });

        if (shiftModels.length === 0) {
            throw new Error(`No shift models found for workcenter_id: ${workcenterId}`);
        }

        return shiftModels.map(shiftModel => shiftModel.dataValues);  // Raw-Daten zurückgeben
    } catch (error) {
        throw new Error(`Error fetching shift models for workcenter_id ${workcenterId}: ${error.message}`);
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: deleteShiftModel,
    getByWorkcenterId  // Neue Funktion zum Abrufen von Schichtmodellen nach workcenter_id
};

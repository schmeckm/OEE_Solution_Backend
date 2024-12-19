const { UnplannedDowntime } = require('../models'); // Importiere das Modell für unplanned_downtime

/**
 * Holt alle unplanned downtimes.
 * @returns {Promise<Array>} Eine Liste von unplanned downtimes.
 */
const getAll = async () => {
    try {
        const downtimes = await UnplannedDowntime.findAll(); // Holt alle unplanned downtimes

        // Nur die reinen Daten ohne Metadaten zurückgeben
        return downtimes.map(downtime => downtime.dataValues); // Zugriff auf 'dataValues' für die reinen Daten
    } catch (error) {
        throw new Error(`Failed to retrieve unplanned downtimes: ${error.message}`);
    }
};

/**
 * Holt eine unplanned downtime nach ID.
 * @param {string} id - Die UUID der unplanned downtime.
 * @returns {Promise<Object|null>} Die unplanned downtime oder null, wenn nicht gefunden.
 */
const getById = async (id) => {
    try {
        const downtime = await UnplannedDowntime.findByPk(id); // Holt die unplanned downtime anhand der ID
        if (!downtime) {
            throw new Error(`Unplanned downtime with ID ${id} not found.`); // Fehlerbehandlung, falls nicht gefunden
        }
        return downtime.dataValues; // Nur die reinen Daten zurückgeben
    } catch (error) {
        throw new Error(`Error loading unplanned downtime with ID ${id}: ${error.message}`);
    }
};

/**
 * Erstellt eine neue unplanned downtime.
 * @param {Object} data - Die Daten der neuen unplanned downtime.
 * @returns {Promise<Object>} Die erstellte unplanned downtime.
 */
const create = async (data) => {
    try {
        // Erstelle eine neue unplanned downtime mit den übergebenen Daten
        const newDowntime = await UnplannedDowntime.create(data);

        return newDowntime.dataValues; // Nur die reinen Daten der erstellten unplanned downtime zurückgeben
    } catch (error) {
        throw new Error(`Failed to create unplanned downtime: ${error.message}`);
    }
};

/**
 * Aktualisiert eine bestehende unplanned downtime.
 * @param {string} id - Die UUID der zu aktualisierenden unplanned downtime.
 * @param {Object} data - Die aktualisierten Daten.
 * @returns {Promise<Object>} Die aktualisierte unplanned downtime.
 */
const update = async (id, data) => {
    try {
        const downtime = await UnplannedDowntime.findByPk(id); // Holt die unplanned downtime anhand der ID
        if (!downtime) {
            throw new Error('Unplanned downtime not found'); // Fehlerbehandlung, falls unplanned downtime nicht gefunden
        }
        const updatedDowntime = await downtime.update(data); // Aktualisiere die unplanned downtime mit den neuen Daten

        return updatedDowntime.dataValues; // Nur die reinen Daten der aktualisierten unplanned downtime zurückgeben
    } catch (error) {
        throw new Error(`Failed to update unplanned downtime with ID ${id}: ${error.message}`);
    }
};

/**
 * Löscht eine unplanned downtime.
 * @param {string} id - Die UUID der zu löschenden unplanned downtime.
 * @returns {Promise<boolean>} True, wenn die unplanned downtime erfolgreich gelöscht wurde.
 */
const deleteDowntime = async (id) => {
    try {
        const downtime = await UnplannedDowntime.findByPk(id); // Holt die unplanned downtime anhand der ID
        if (!downtime) {
            throw new Error('Unplanned downtime not found'); // Fehlerbehandlung, falls unplanned downtime nicht gefunden
        }
        await downtime.destroy(); // Lösche die unplanned downtime
        return true; // Gibt zurück, dass die unplanned downtime erfolgreich gelöscht wurde
    } catch (error) {
        throw new Error(`Failed to delete unplanned downtime with ID ${id}: ${error.message}`);
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: deleteDowntime,
};

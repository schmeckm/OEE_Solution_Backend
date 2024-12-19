const { Tact } = require('../models'); // Importiere das Tact-Modell

/**
 * Holt alle Tact-Daten.
 * @returns {Promise<Array>} Eine Liste von Tact-Daten.
 */
const getAll = async () => {
    try {
        const tacts = await Tact.findAll(); // Holt alle Tact-Daten
        return tacts.map(tact => tact.dataValues); // Zugriff auf 'dataValues' für die reinen Daten
    } catch (error) {
        throw new Error(`Failed to retrieve Tact data: ${error.message}`);
    }
};

/**
 * Holt eine Tact-Daten nach ID.
 * @param {string} id - Die UUID der Tact-Daten.
 * @returns {Promise<Object|null>} Die Tact-Daten oder null, wenn nicht gefunden.
 */
const getById = async (id) => {
    try {
        const tact = await Tact.findByPk(id); // Holt die Tact-Daten anhand der ID
        if (!tact) {
            throw new Error(`Tact data with ID ${id} not found.`); // Fehlerbehandlung, falls nicht gefunden
        }
        return tact.dataValues; // Nur die reinen Daten zurückgeben
    } catch (error) {
        throw new Error(`Error loading Tact data with ID ${id}: ${error.message}`);
    }
};

/**
 * Erstellt eine neue Tact-Daten.
 * @param {Object} data - Die Daten der neuen Tact-Daten.
 * @returns {Promise<Object>} Die erstellte Tact-Daten.
 */
const create = async (data) => {
    try {
        const newTact = await Tact.create(data); // Erstelle eine neue Tact-Daten mit den übergebenen Daten
        return newTact.dataValues; // Nur die reinen Daten der erstellten Tact-Daten zurückgeben
    } catch (error) {
        throw new Error(`Failed to create Tact data: ${error.message}`);
    }
};

/**
 * Aktualisiert eine bestehende Tact-Daten.
 * @param {string} id - Die UUID der zu aktualisierenden Tact-Daten.
 * @param {Object} data - Die aktualisierten Daten.
 * @returns {Promise<Object>} Die aktualisierte Tact-Daten.
 */
const update = async (id, data) => {
    try {
        const tact = await Tact.findByPk(id); // Holt die Tact-Daten anhand der ID
        if (!tact) {
            throw new Error('Tact not found'); // Fehlerbehandlung, falls Tact-Daten nicht gefunden
        }
        const updatedTact = await tact.update(data); // Aktualisiere die Tact-Daten mit den neuen Daten
        return updatedTact.dataValues; // Nur die reinen Daten der aktualisierten Tact-Daten zurückgeben
    } catch (error) {
        throw new Error(`Failed to update Tact data with ID ${id}: ${error.message}`);
    }
};

/**
 * Löscht eine Tact-Daten.
 * @param {string} id - Die UUID der zu löschenden Tact-Daten.
 * @returns {Promise<boolean>} True, wenn die Tact-Daten erfolgreich gelöscht wurden.
 */
const deleteTact = async (id) => {
    try {
        const tact = await Tact.findByPk(id); // Holt die Tact-Daten anhand der ID
        if (!tact) {
            throw new Error('Tact not found'); // Fehlerbehandlung, falls Tact-Daten nicht gefunden
        }
        await tact.destroy(); // Lösche die Tact-Daten
        return true; // Gibt zurück, dass die Tact-Daten erfolgreich gelöscht wurden
    } catch (error) {
        throw new Error(`Failed to delete Tact data with ID ${id}: ${error.message}`);
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: deleteTact,
};

const { Microstop } = require('../models'); // Importiere das Modell für Microstop

/**
 * Holt alle Microstop-Daten.
 * @returns {Promise<Array>} Eine Liste von Microstop-Daten.
 */
const getAll = async () => {
    try {
        const microstops = await Microstop.findAll(); // Holt alle Microstop-Daten

        // Nur die reinen Daten ohne Metadaten zurückgeben
        return microstops.map(microstop => microstop.dataValues); // Zugriff auf 'dataValues' für die reinen Daten
    } catch (error) {
        throw new Error(`Failed to retrieve microstops: ${error.message}`);
    }
};

/**
 * Holt eine Microstop-Daten nach ID.
 * @param {string} id - Die UUID der Microstop-Daten.
 * @returns {Promise<Object|null>} Die Microstop-Daten oder null, wenn nicht gefunden.
 */
const getById = async (id) => {
    try {
        const microstop = await Microstop.findByPk(id); // Holt die Microstop-Daten anhand der ID
        if (!microstop) {
            throw new Error(`Microstop with ID ${id} not found.`); // Fehlerbehandlung, falls nicht gefunden
        }
        return microstop.dataValues; // Nur die reinen Daten zurückgeben
    } catch (error) {
        throw new Error(`Error loading microstop with ID ${id}: ${error.message}`);
    }
};

/**
 * Erstellt eine neue Microstop-Daten.
 * @param {Object} data - Die Daten der neuen Microstop-Daten.
 * @returns {Promise<Object>} Die erstellte Microstop-Daten.
 */
const create = async (data) => {
    try {
        // Erstelle eine neue Microstop-Daten mit den übergebenen Daten
        const newMicrostop = await Microstop.create(data);

        return newMicrostop.dataValues; // Nur die reinen Daten der erstellten Microstop-Daten zurückgeben
    } catch (error) {
        throw new Error(`Failed to create microstop: ${error.message}`);
    }
};

/**
 * Aktualisiert eine bestehende Microstop-Daten.
 * @param {string} id - Die UUID der zu aktualisierenden Microstop-Daten.
 * @param {Object} data - Die aktualisierten Daten.
 * @returns {Promise<Object>} Die aktualisierte Microstop-Daten.
 */
const update = async (id, data) => {
    try {
        const microstop = await Microstop.findByPk(id); // Holt die Microstop-Daten anhand der ID
        if (!microstop) {
            throw new Error('Microstop not found'); // Fehlerbehandlung, falls Microstop nicht gefunden
        }
        const updatedMicrostop = await microstop.update(data); // Aktualisiere die Microstop-Daten mit den neuen Daten

        return updatedMicrostop.dataValues; // Nur die reinen Daten der aktualisierten Microstop-Daten zurückgeben
    } catch (error) {
        throw new Error(`Failed to update microstop with ID ${id}: ${error.message}`);
    }
};

/**
 * Löscht eine Microstop-Daten.
 * @param {string} id - Die UUID der zu löschenden Microstop-Daten.
 * @returns {Promise<boolean>} True, wenn die Microstop-Daten erfolgreich gelöscht wurden.
 */
const deleteMicrostop = async (id) => {
    try {
        const microstop = await Microstop.findByPk(id); // Holt die Microstop-Daten anhand der ID
        if (!microstop) {
            throw new Error('Microstop not found'); // Fehlerbehandlung, falls Microstop nicht gefunden
        }
        await microstop.destroy(); // Lösche die Microstop-Daten
        return true; // Gibt zurück, dass die Microstop-Daten erfolgreich gelöscht wurden
    } catch (error) {
        throw new Error(`Failed to delete microstop with ID ${id}: ${error.message}`);
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: deleteMicrostop,
};

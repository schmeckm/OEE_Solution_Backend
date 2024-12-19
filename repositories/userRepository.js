const { User } = require('../models'); // Importiere das User-Modell

/**
 * Holt alle User-Daten.
 * @returns {Promise<Array>} Eine Liste von User-Daten.
 */
const getAll = async () => {
    try {
        const users = await User.findAll(); // Holt alle User-Daten
        return users.map(user => user.dataValues); // Zugriff auf 'dataValues' für die reinen Daten
    } catch (error) {
        throw new Error(`Failed to retrieve User data: ${error.message}`);
    }
};

/**
 * Holt eine User-Daten nach ID.
 * @param {string} id - Die ID der User-Daten.
 * @returns {Promise<Object|null>} Die User-Daten oder null, wenn nicht gefunden.
 */
const getById = async (id) => {
    try {
        const user = await User.findByPk(id); // Holt die User-Daten anhand der ID
        if (!user) {
            throw new Error(`User data with ID ${id} not found.`); // Fehlerbehandlung, falls nicht gefunden
        }
        return user.dataValues; // Nur die reinen Daten zurückgeben
    } catch (error) {
        throw new Error(`Error loading User data with ID ${id}: ${error.message}`);
    }
};

/**
 * Erstellt eine neue User-Daten.
 * @param {Object} data - Die Daten des neuen Users.
 * @returns {Promise<Object>} Die erstellte User-Daten.
 */
const create = async (data) => {
    try {
        const newUser = await User.create(data); // Erstelle eine neue User-Daten mit den übergebenen Daten
        return newUser.dataValues; // Nur die reinen Daten der erstellten User-Daten zurückgeben
    } catch (error) {
        throw new Error(`Failed to create User data: ${error.message}`);
    }
};

/**
 * Aktualisiert eine bestehende User-Daten.
 * @param {string} id - Die ID der zu aktualisierenden User-Daten.
 * @param {Object} data - Die aktualisierten Daten.
 * @returns {Promise<Object>} Die aktualisierte User-Daten.
 */
const update = async (id, data) => {
    try {
        const user = await User.findByPk(id); // Holt die User-Daten anhand der ID
        if (!user) {
            throw new Error('User not found'); // Fehlerbehandlung, falls User-Daten nicht gefunden
        }
        const updatedUser = await user.update(data); // Aktualisiere die User-Daten mit den neuen Daten
        return updatedUser.dataValues; // Nur die reinen Daten der aktualisierten User-Daten zurückgeben
    } catch (error) {
        throw new Error(`Failed to update User data with ID ${id}: ${error.message}`);
    }
};

/**
 * Löscht eine User-Daten.
 * @param {string} id - Die ID der zu löschenden User-Daten.
 * @returns {Promise<boolean>} True, wenn die User-Daten erfolgreich gelöscht wurden.
 */
const deleteUser = async (id) => {
    try {
        const user = await User.findByPk(id); // Holt die User-Daten anhand der ID
        if (!user) {
            throw new Error('User not found'); // Fehlerbehandlung, falls User-Daten nicht gefunden
        }
        await user.destroy(); // Lösche die User-Daten
        return true; // Gibt zurück, dass die User-Daten erfolgreich gelöscht wurden
    } catch (error) {
        throw new Error(`Failed to delete User data with ID ${id}: ${error.message}`);
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: deleteUser,
};

const { ProcessOrder } = require('../models'); // Importiert das Modell aus models/index.js

/**
 * Holt alle Prozessaufträge.
 * @returns {Promise<Array>} Eine Liste von Prozessaufträgen.
 */
const getAll = async () => {
    try {
        return await ProcessOrder.findAll();
    } catch (error) {
        throw new Error(`Failed to retrieve process orders: ${error.message}`);
    }
};

/**
 * Holt einen Prozessauftrag nach ID.
 * @param {string} id - Die UUID des Prozessauftrags.
 * @returns {Promise<Object|null>} Der Prozessauftrag oder null, wenn nicht gefunden.
 */

// Funktion zum Abrufen eines Prozessauftrags anhand der ID
const getById  = async (id) => {
    try {
        const processOrder = await ProcessOrder.findByPk(id);
        if (!processOrder) {
            throw new Error(`Process order with ID ${id} not found.`);
        }
        return processOrder;
    } catch (error) {
        throw new Error(`Error loading process order with ID ${id}: ${error.message}`);
    }
};

/**
 * Erstellt einen neuen Prozessauftrag.
 * @param {Object} data - Die Daten des neuen Prozessauftrags.
 * @returns {Promise<Object>} Der erstellte Prozessauftrag.
 */
const create = async (data) => {
    try {
        return await ProcessOrder.create(data);
    } catch (error) {
        throw new Error(`Failed to create process order: ${error.message}`);
    }
};

/**
 * Aktualisiert einen bestehenden Prozessauftrag.
 * @param {string} id - Die UUID des zu aktualisierenden Prozessauftrags.
 * @param {Object} data - Die aktualisierten Daten.
 * @returns {Promise<Object>} Der aktualisierte Prozessauftrag.
 */
const update = async (id, data) => {
    try {
        const order = await ProcessOrder.findByPk(id);
        if (!order) {
            throw new Error('Process order not found');
        }
        return await order.update(data);
    } catch (error) {
        throw new Error(`Failed to update process order with ID ${id}: ${error.message}`);
    }
};

/**
 * Löscht einen Prozessauftrag.
 * @param {string} id - Die UUID des zu löschenden Prozessauftrags.
 * @returns {Promise<boolean>} True, wenn der Auftrag erfolgreich gelöscht wurde.
 */
const deleteOrder = async (id) => {
    try {
        const order = await ProcessOrder.findByPk(id);
        if (!order) {
            throw new Error('Process order not found');
        }
        await order.destroy();
        return true;
    } catch (error) {
        throw new Error(`Failed to delete process order with ID ${id}: ${error.message}`);
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: deleteOrder, // Exportieren als `delete`
};

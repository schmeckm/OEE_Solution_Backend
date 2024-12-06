const { PlannedOrder } = require('../models'); // Importiert das Modell aus models/index.js

/**
 * Holt alle Prozessaufträge.
 * @returns {Promise<Array>} Eine Liste von Prozessaufträgen.
 */
const getAll = async () => {
    try {
        const orders = await PlannedOrder.findAll(); // Holt alle Prozessaufträge

        // Nur die reinen Daten ohne Metadaten zurückgeben
        return orders.map(order => order.dataValues); // Zugriff auf 'dataValues' für die reinen Daten
    } catch (error) {
        throw new Error(`Failed to retrieve planned orders: ${error.message}`);
    }
};

/**
 * Holt einen Prozessauftrag nach ID.
 * @param {string} id - Die UUID des Prozessauftrags.
 * @returns {Promise<Object|null>} Der Prozessauftrag oder null, wenn nicht gefunden.
 */
const getById = async (id) => {
    try {
        const order = await PlannedOrder.findByPk(id); // Holt den Prozessauftrag anhand der ID
        if (!order) {
            throw new Error(`Planned order with ID ${id} not found.`); // Fehlerbehandlung, falls nicht gefunden
        }
        return order.dataValues; // Nur die reinen Daten zurückgeben
    } catch (error) {
        throw new Error(`Error loading planned order with ID ${id}: ${error.message}`);
    }
};



/**
 * Erstellt einen neuen Prozessauftrag.
 * @param {Object} data - Die Daten des neuen Prozessauftrags.
 * @returns {Promise<Object>} Der erstellte Prozessauftrag.
 */
const create = async (data) => {
    try {
        // Erstelle einen neuen Prozessauftrag mit den übergebenen Daten
        const newOrder = await PlannedOrder.create(data);

        return newOrder.dataValues; // Nur die reinen Daten des erstellten Auftrags zurückgeben
    } catch (error) {
        throw new Error(`Failed to create planned order: ${error.message}`);
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
        const order = await PlannedOrder.findByPk(id); // Holt den Auftrag anhand der ID
        if (!order) {
            throw new Error('Planned order not found'); // Fehlerbehandlung, falls Auftrag nicht gefunden
        }
        const updatedOrder = await order.update(data); // Aktualisiere den Auftrag mit den neuen Daten

        return updatedOrder.dataValues; // Nur die reinen Daten des aktualisierten Auftrags zurückgeben
    } catch (error) {
        throw new Error(`Failed to update planned order with ID ${id}: ${error.message}`);
    }
};

/**
 * Löscht einen Prozessauftrag.
 * @param {string} id - Die UUID des zu löschenden Prozessauftrags.
 * @returns {Promise<boolean>} True, wenn der Auftrag erfolgreich gelöscht wurde.
 */
const deleteOrder = async (id) => {
    try {
        const order = await PlannedOrder.findByPk(id); // Holt den Auftrag anhand der ID
        if (!order) {
            throw new Error('Planned order not found'); // Fehlerbehandlung, falls Auftrag nicht gefunden
        }
        await order.destroy(); // Lösche den Auftrag
        return true; // Gibt zurück, dass der Auftrag erfolgreich gelöscht wurde
    } catch (error) {
        throw new Error(`Failed to delete planned order with ID ${id}: ${error.message}`);
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: deleteOrder,
};

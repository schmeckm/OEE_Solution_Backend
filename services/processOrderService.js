const moment = require("moment-timezone");
const { dateSettings } = require("../config/config");
const processOrderRepository = require('../repositories/ProcessOrderRepository');

// Hilfsfunktion zur gemeinsamen Datumsformatierung (vor und nach dem Speichern)
const formatDate = (date, timezone, isSaving = false) => {
    const momentDate = moment.tz(date, timezone);
    return isSaving ? momentDate.utc().toDate() : momentDate.format(dateSettings.dateFormat);
};

// Funktion zum Formatieren der Datumsfelder nach dem Laden
const formatDates = (processOrder) => {
    const { timezone } = dateSettings;
    return {
        ...processOrder,
        Start: formatDate(processOrder.Start, timezone),
        End: formatDate(processOrder.End, timezone),
        ActualProcessOrderStart: processOrder.ActualProcessOrderStart
            ? formatDate(processOrder.ActualProcessOrderStart, timezone)
            : null,
        ActualProcessOrderEnd: processOrder.ActualProcessOrderEnd
            ? formatDate(processOrder.ActualProcessOrderEnd, timezone)
            : null,
    };
};

// Funktion zum Formatieren der Datumsfelder vor dem Speichern
const formatDatesBeforeSave = (processOrder) => {
    const { timezone } = dateSettings;
    return {
        ...processOrder,
        Start: formatDate(processOrder.Start, timezone, true),
        End: formatDate(processOrder.End, timezone, true),
        ActualProcessOrderStart: processOrder.ActualProcessOrderStart
            ? formatDate(processOrder.ActualProcessOrderStart, timezone, true)
            : null,
        ActualProcessOrderEnd: processOrder.ActualProcessOrderEnd
            ? formatDate(processOrder.ActualProcessOrderEnd, timezone, true)
            : null,
    };
};

/**
 * Lädt alle Prozessaufträge.
 * @returns {Promise<Array>} Eine Liste von formatierten Prozessaufträgen.
 */
const loadAllProcessOrders = async () => {
    try {
        // Verwende das Repository, nicht das Modell direkt
        const processOrders = await processOrderRepository.getAll();
        
        // Extrahiere nur die 'dataValues' und formatiere die Daten
        return processOrders.map((order) => {
            const data = order.dataValues; // Extrahiere nur die `dataValues`
            return formatDates(data); // Wende die Formatierung auf die reinen Daten an
        });
    } catch (error) {
        console.error(`Fehler beim Laden aller Prozessaufträge: ${error.message}`);
        throw error;
    }
};
/**
 * Lädt einen spezifischen Prozessauftrag nach ID.
 * @param {string} id - Die UUID des Prozessauftrags.
 * @returns {Promise<Object>} Der gefundene und formatierten Prozessauftrag.
 */
const loadProcessOrderById = async (id) => {
    try {
        const processOrder = await processOrderRepository.getById(id);
        if (!processOrder) {
            throw new Error('Process order not found');
        }
        return formatDates(processOrder);
    } catch (error) {
        console.error(`Fehler beim Laden des Prozessauftrags mit ID ${id}: ${error.message}`);
        throw error;
    }
};

/**
 * Erstellt einen neuen Prozessauftrag.
 * @param {Object} processOrderData - Die Daten des neuen Prozessauftrags.
 * @returns {Promise<Object>} Der erstellte und formatierten Prozessauftrag.
 */
const createProcessOrder = async (processOrderData) => {
    try {
        const formattedData = formatDatesBeforeSave(processOrderData);
        const newOrder = await processOrderRepository.create(formattedData);
        return formatDates(newOrder);
    } catch (error) {
        console.error(`Fehler beim Erstellen eines neuen Prozessauftrags: ${error.message}`);
        throw error;
    }
};

/**
 * Aktualisiert einen bestehenden Prozessauftrag.
 * @param {string} id - Die UUID des zu aktualisierenden Prozessauftrags.
 * @param {Object} updatedData - Die aktualisierten Daten.
 * @returns {Promise<Object>} Der aktualisierte und formatierten Prozessauftrag.
 */
const updateProcessOrder = async (id, updatedData) => {
    try {
        const formattedData = formatDatesBeforeSave(updatedData);
        const updatedOrder = await processOrderRepository.update(id, formattedData);
        return formatDates(updatedOrder);
    } catch (error) {
        console.error(`Fehler beim Aktualisieren des Prozessauftrags mit ID ${id}: ${error.message}`);
        throw error;
    }
};

/**
 * Löscht einen Prozessauftrag.
 * @param {string} id - Die UUID des zu löschenden Prozessauftrags.
 * @returns {Promise<boolean>} True, wenn der Auftrag erfolgreich gelöscht wurde.
 */
const deleteProcessOrder = async (id) => {
    try {
        return await processOrderRepository.delete(id);
    } catch (error) {
        console.error(`Fehler beim Löschen des Prozessauftrags mit ID ${id}: ${error.message}`);
        throw error;
    }
};

module.exports = {
    loadAllProcessOrders,
    loadProcessOrderById,
    createProcessOrder,
    updateProcessOrder,
    deleteProcessOrder,
};

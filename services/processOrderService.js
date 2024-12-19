const moment = require("moment-timezone");
const { dateSettings } = require("../config/config");
const processOrderRepository = require('../repositories/ProcessOrderRepository');

// Helper function to format date fields (before saving or after loading)
const formatDate = (date, timezone, isSaving = false) => {
    const momentDate = moment.tz(date, timezone);
    return isSaving ? momentDate.utc().toDate() : momentDate.format(dateSettings.dateFormat);
};

// Function to format date fields after loading from the database
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

// Function to format date fields before saving to the database
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
 * Fetches all process orders.
 * @returns {Promise<Array>} A list of formatted process orders.
 */
const loadAllProcessOrders = async () => {
    try {
        // Use the repository to fetch data, not the model directly
        const processOrders = await processOrderRepository.getAll();

        // Extract only the `dataValues` and format the data
        return processOrders.map((order) => {
            const data = order.dataValues; // Extract the `dataValues`
            return formatDates(data); // Apply formatting to the raw data
        });
    } catch (error) {
        console.error(`Error loading all process orders: ${error.message}`);
        throw error;
    }
};

/**
 * Fetches a specific process order by ID.
 * @param {string} id - The UUID of the process order.
 * @returns {Promise<Object>} The found and formatted process order.
 */
const loadProcessOrderById = async (id) => {
    try {
        const processOrder = await processOrderRepository.getById(id);
        if (!processOrder) {
            throw new Error('Process order not found');
        }
        return formatDates(processOrder); // Format the data before returning
    } catch (error) {
        console.error(`Error loading process order with ID ${id}: ${error.message}`);
        throw error;
    }
};

/**
 * Creates a new process order.
 * @param {Object} processOrderData - The data for the new process order.
 * @returns {Promise<Object>} The created and formatted process order.
 */
const createProcessOrder = async (processOrderData) => {
    try {
        const formattedData = formatDatesBeforeSave(processOrderData); // Format before saving
        const newOrder = await processOrderRepository.create(formattedData);
        return formatDates(newOrder); // Format the data after saving and return
    } catch (error) {
        console.error(`Error creating a new process order: ${error.message}`);
        throw error;
    }
};

/**
 * Updates an existing process order.
 * @param {string} id - The UUID of the process order to update.
 * @param {Object} updatedData - The updated data.
 * @returns {Promise<Object>} The updated and formatted process order.
 */
const updateProcessOrder = async (id, updatedData) => {
    try {
        const formattedData = formatDatesBeforeSave(updatedData); // Format before updating
        const updatedOrder = await processOrderRepository.update(id, formattedData);
        return formatDates(updatedOrder); // Format the data after updating and return
    } catch (error) {
        console.error(`Error updating process order with ID ${id}: ${error.message}`);
        throw error;
    }
};

/**
 * Deletes a process order.
 * @param {string} id - The UUID of the process order to delete.
 * @returns {Promise<boolean>} True if the process order was successfully deleted.
 */
const deleteProcessOrder = async (id) => {
    try {
        return await processOrderRepository.delete(id); // Use repository to delete
    } catch (error) {
        console.error(`Error deleting process order with ID ${id}: ${error.message}`);
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

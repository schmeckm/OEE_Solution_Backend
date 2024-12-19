const { ShiftModel } = require('../models'); // Import the ShiftModel

/**
 * Retrieves all ShiftModel records from the database.
 * @returns {Promise<Array>} List of all ShiftModel records.
 */
const getAll = async () => {
    try {
        const shiftModels = await ShiftModel.findAll(); // Retrieve all records from ShiftModel table
        return shiftModels.map(shiftModel => shiftModel.dataValues); // Extract the raw data from Sequelize instances
    } catch (error) {
        throw new Error(`Failed to retrieve shift models: ${error.message}`); // Error handling
    }
};

/**
 * Retrieves a single ShiftModel by its ID.
 * @param {string} id - The UUID of the ShiftModel to retrieve.
 * @returns {Promise<Object|null>} The ShiftModel data or null if not found.
 */
const getById = async (id) => {
    try {
        const shiftModel = await ShiftModel.findByPk(id); // Find a shift by primary key (shift_id)
        if (!shiftModel) {
            throw new Error(`Shift model with ID ${id} not found.`); // If not found, throw an error
        }
        return shiftModel.dataValues; // Return the raw data from the ShiftModel instance
    } catch (error) {
        throw new Error(`Error fetching shift model with ID ${id}: ${error.message}`); // Error handling
    }
};

/**
 * Creates a new ShiftModel record.
 * @param {Object} data - Data for the new ShiftModel.
 * @returns {Promise<Object>} The created ShiftModel data.
 */
const create = async (data) => {
    try {
        // Optional: Validate the data here before creating the record
        if (!data.workcenter_id || !data.shift_name || !data.shift_start_time || !data.shift_end_time) {
            throw new Error('Missing required fields: workcenter_id, shift_name, shift_start_time, or shift_end_time.');
        }

        const newShiftModel = await ShiftModel.create(data); // Create a new ShiftModel record
        return newShiftModel.dataValues; // Return the raw data from the newly created ShiftModel
    } catch (error) {
        throw new Error(`Failed to create shift model: ${error.message}`); // Error handling
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
        const shiftModel = await ShiftModel.findByPk(id); // Find the shift by ID
        if (!shiftModel) {
            throw new Error(`Shift model with ID ${id} not found.`); // If not found, throw an error
        }

        // Optional: Validate the data before updating
        if (data.shift_start_time && data.shift_end_time && data.shift_start_time >= data.shift_end_time) {
            throw new Error('Shift start time must be before shift end time.');
        }

        const updatedShiftModel = await shiftModel.update(data); // Update the ShiftModel record
        return updatedShiftModel.dataValues; // Return the raw updated data
    } catch (error) {
        throw new Error(`Failed to update shift model with ID ${id}: ${error.message}`); // Error handling
    }
};

/**
 * Deletes a ShiftModel by its ID.
 * @param {string} id - The UUID of the ShiftModel to delete.
 * @returns {Promise<boolean>} True if deleted successfully, false if not found.
 */
const deleteShiftModel = async (id) => {
    try {
        const shiftModel = await ShiftModel.findByPk(id); // Find the shift by ID
        if (!shiftModel) {
            throw new Error(`Shift model with ID ${id} not found.`); // If not found, throw an error
        }

        await shiftModel.destroy(); // Delete the ShiftModel record
        return true; // Return true indicating successful deletion
    } catch (error) {
        throw new Error(`Failed to delete shift model with ID ${id}: ${error.message}`); // Error handling
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: deleteShiftModel, // Export the delete function
};

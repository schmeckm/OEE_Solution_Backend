const { Tact } = require('../models');  // Import the Tact model

/**
 * Handles errors by throwing a new error with a specific message.
 * @param {string} action - The action being performed when the error occurred.
 * @param {Error} error - The error that occurred.
 * @throws {Error} Throws a new error with a specific message.
 */
const handleError = (action, error) => {
  throw new Error(`Error ${action} tact: ${error.message}`);
};

/**
 * Fetches all Tact records.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of Tact records.
 * @throws {Error} If an error occurs while fetching the Tact records.
 */
const loadTacts = async () => {
  try {
    return await Tact.findAll();
  } catch (error) {
    handleError('fetching all', error);
  }
};

/**
 * Fetches a Tact record by its ID.
 * @param {number} id - The ID of the Tact record to fetch.
 * @returns {Promise<Object|null>} A promise that resolves to the Tact record, or null if not found.
 * @throws {Error} If an error occurs while fetching the Tact record.
 */
const loadTactById = async (id) => {
  try {
    return await Tact.findOne({ where: { tact_id: id } });
  } catch (error) {
    handleError(`fetching with ID ${id}`, error);
  }
};

/**
 * Creates a new Tact record.
 * @param {Object} data - The data for the new Tact record.
 * @returns {Promise<Object>} A promise that resolves to the created Tact record.
 * @throws {Error} If an error occurs while creating the Tact record.
 */
const createTact = async (data) => {
  try {
    return await Tact.create(data);
  } catch (error) {
    handleError('creating', error);
  }
};

/**
 * Updates a Tact record with the given data.
 * @param {number} id - The ID of the Tact record to update.
 * @param {Object} data - The data to update the Tact record with.
 * @returns {Promise<Object>} The updated Tact record.
 * @throws {Error} If the Tact record with the given ID is not found or if an error occurs during the update.
 */
const updateTact = async (id, data) => {
  try {
    const tact = await Tact.findByPk(id);
    if (!tact) throw new Error(`Tact with ID ${id} not found`);
    return await tact.update(data);
  } catch (error) {
    handleError('updating', error);
  }
};

/**
 * Deletes a Tact record by its ID.
 * @param {number} id - The ID of the Tact record to delete.
 * @returns {Promise<boolean>} Returns true if the Tact record was successfully deleted.
 * @throws {Error} Throws an error if the Tact record is not found or if there is an issue during deletion.
 */
const deleteTact = async (id) => {
  try {
    const tact = await Tact.findByPk(id);
    if (!tact) throw new Error(`Tact with ID ${id} not found`);
    await tact.destroy();
    return true;
  } catch (error) {
    handleError('deleting', error);
  }
};

module.exports = {
  loadTacts,
  loadTactById,
  createTact,
  updateTact,
  deleteTact,
};
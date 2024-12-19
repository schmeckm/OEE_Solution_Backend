const { User } = require('../models');  // Importiert das User-Modell

/**
 * Holt alle User-Daten
 * @returns {Promise<Array>} Eine Liste von User-Daten.
 */
const loadUsers = async () => {
  try {
    return await User.findAll();  // Alle User-Daten aus der DB abfragen
  } catch (error) {
    throw new Error(`Error fetching user data: ${error.message}`);
  }
};

/**
 * Holt ein User-Daten anhand der ID
 * @param {string} id - Die UUID des User-Datensatzes.
 * @returns {Promise<Object|null>} Der User-Datensatz oder null, wenn nicht gefunden.
 */
const loadUserById = async (id) => {
  try {
    return await User.findOne({ where: { id } });  // Nach id suchen
  } catch (error) {
    throw new Error(`Error fetching user with ID ${id}: ${error.message}`);
  }
};

/**
 * Erstellt ein neues User-Modell
 * @param {Object} data - Die Daten des neuen Users
 * @returns {Promise<Object>} Der erstellte User
 */
const createUser = async (data) => {
  try {
    return await User.create(data);  // Erstellt das User-Modell
  } catch (error) {
    throw new Error(`Error creating user: ${error.message}`);
  }
};

/**
 * Aktualisiert ein User-Modell
 * @param {string} id - Die ID des zu aktualisierenden Users
 * @param {Object} data - Die neuen Daten des Users
 * @returns {Promise<Object>} Der aktualisierte User
 */
const updateUser = async (id, data) => {
  try {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    return await user.update(data);  // Das User-Modell mit den neuen Daten aktualisieren
  } catch (error) {
    throw new Error(`Error updating user: ${error.message}`);
  }
};

/**
 * Löscht ein User-Modell
 * @param {string} id - Die ID des zu löschenden Users
 * @returns {Promise<boolean>} True, wenn der User erfolgreich gelöscht wurde
 */
const deleteUser = async (id) => {
  try {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    await user.destroy();  // Löscht das User-Modell
    return true;
  } catch (error) {
    throw new Error(`Error deleting user: ${error.message}`);
  }
};

module.exports = {
  loadUsers,
  loadUserById,
  createUser,
  updateUser,
  deleteUser,
};

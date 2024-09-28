const express = require('express');
const { loadEnvConfig, saveEnvConfig } = require('../services/settingsService');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Environment Configuration
 *   description: API for managing environment configuration settings
 */

/**
 * @swagger
 * /settings/env:
 *   get:
 *     summary: Get the entire environment configuration
 *     tags: [Environment Configuration]
 *     description: Retrieve all the settings from the `.env` file.
 *     responses:
 *       200:
 *         description: A list of all environment settings.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/env', (req, res) => {
    try {
        const envConfig = loadEnvConfig(); // Load the current environment configuration
        res.json(envConfig); // Return the configuration as JSON
    } catch (error) {
        res.status(500).json({ message: error.message }); // Return an error if something goes wrong
    }
});

/**
 * @swagger
 * /settings/env:
 *   put:
 *     summary: Update the entire environment configuration
 *     tags: [Environment Configuration]
 *     description: Update all settings in the `.env` file.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: The updated configuration values.
 *     responses:
 *       200:
 *         description: Environment configuration updated successfully.
 *       500:
 *         description: Internal server error.
 */
router.put('/env', (req, res) => {
    try {
        const newEnvConfig = req.body; // Get the new configuration from the request body
        saveEnvConfig(newEnvConfig); // Save the updated configuration
        res.status(200).json({ message: 'Environment configuration updated successfully' }); // Confirm the update
    } catch (error) {
        res.status(500).json({ message: error.message }); // Handle any errors
    }
});

/**
 * @swagger
 * /settings/env/{key}:
 *   get:
 *     summary: Get a specific environment setting
 *     tags: [Environment Configuration]
 *     description: Retrieve the value of a specific key from the `.env` file.
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: The environment key to retrieve.
 *     responses:
 *       200:
 *         description: The value of the specified environment key.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 key:
 *                   type: string
 *       404:
 *         description: Key not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/env/:key', (req, res) => {
    try {
        const envConfig = loadEnvConfig(); // Load the current environment configuration
        const key = req.params.key; // Get the key from the URL parameter
        if (envConfig[key] !== undefined) {
            res.json({
                [key]: envConfig[key]
            }); // Return the key-value pair if it exists
        } else {
            res.status(404).json({ message: `Key ${key} not found` }); // Return a 404 error if the key is not found
        }
    } catch (error) {
        res.status(500).json({ message: error.message }); // Handle any errors
    }
});

/**
 * @swagger
 * /settings/env/{key}:
 *   put:
 *     summary: Update a specific environment setting
 *     tags: [Environment Configuration]
 *     description: Update the value of a specific key in the `.env` file.
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: The environment key to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Key updated successfully.
 *       404:
 *         description: Key not found.
 *       500:
 *         description: Internal server error.
 */
router.put('/env/:key', (req, res) => {
    try {
        const envConfig = loadEnvConfig(); // Load the current environment configuration
        const key = req.params.key; // Get the key from the URL parameter
        const value = req.body.value; // Get the new value from the request body
        envConfig[key] = value; // Update the key with the new value
        saveEnvConfig(envConfig); // Save the updated configuration
        res.status(200).json({ message: `Key ${key} updated successfully` }); // Confirm the update
    } catch (error) {
        res.status(500).json({ message: error.message }); // Handle any errors
    }
});

/**
 * @swagger
 * /settings/env:
 *   post:
 *     summary: Add a new environment setting
 *     tags: [Environment Configuration]
 *     description: Add a new key-value pair to the `.env` file.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties:
 *               type: string
 *     responses:
 *       201:
 *         description: New configuration added successfully.
 *       500:
 *         description: Internal server error.
 */
router.post('/env', (req, res) => {
    try {
        const envConfig = loadEnvConfig(); // Load the current environment configuration
        const newConfig = req.body; // Get the new configuration from the request body
        for (let key in newConfig) {
            envConfig[key] = newConfig[key]; // Add each new key-value pair to the configuration
        }
        saveEnvConfig(envConfig); // Save the updated configuration
        res.status(201).json({ message: 'New configuration added successfully' }); // Confirm the addition
    } catch (error) {
        res.status(500).json({ message: error.message }); // Handle any errors
    }
});

/**
 * @swagger
 * /settings/env/{key}:
 *   delete:
 *     summary: Delete a specific environment setting
 *     tags: [Environment Configuration]
 *     description: Remove a key-value pair from the `.env` file.
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: The environment key to delete.
 *     responses:
 *       200:
 *         description: Key deleted successfully.
 *       404:
 *         description: Key not found.
 *       500:
 *         description: Internal server error.
 */
router.delete('/env/:key', (req, res) => {
    try {
        const envConfig = loadEnvConfig(); // Load the current environment configuration
        const key = req.params.key; // Get the key from the URL parameter
        if (envConfig[key] !== undefined) {
            delete envConfig[key]; // Delete the key-value pair if it exists
            saveEnvConfig(envConfig); // Save the updated configuration
            res.status(200).json({ message: `Key ${key} deleted successfully` }); // Confirm the deletion
        } else {
            res.status(404).json({ message: `Key ${key} not found` }); // Return a 404 error if the key is not found
        }
    } catch (error) {
        res.status(500).json({ message: error.message }); // Handle any errors
    }
});

module.exports = router; // Export the router object for use in other parts of the application
const express = require('express');
const { loadOEEConfig, saveOEEConfig } = require('../services/oeeConfigService');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: OEE Configuration
 *   description: API for managing OEE configurations
 */

/**
 * @swagger
 * /oeeconfig:
 *   get:
 *     summary: Get the entire OEE configuration
 *     tags: [OEE Configuration]
 *     description: Retrieve the entire OEE configuration formatted as an array.
 *     responses:
 *       200:
 *         description: The entire OEE configuration as an array.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/', (req, res) => {
    try {
        const oeeConfig = loadOEEConfig();

        // Format the object into an array
        const formattedData = Object.entries(oeeConfig).map(([key, value]) => ({
            key, // Add the key as a property
            ...value // Spread the rest of the properties
        }));

        res.status(200).json(formattedData);
    } catch (error) {
        console.error('Error loading OEE configuration:', error);
        res.status(500).json({ message: 'Failed to retrieve OEE configuration' });
    }
});

/**
 * @swagger
 * /oeeconfig/{key}:
 *   get:
 *     summary: Get a specific OEE configuration
 *     tags: [OEE Configuration]
 *     description: Retrieve the value of a specific OEE configuration key.
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: The OEE configuration key to retrieve.
 *     responses:
 *       200:
 *         description: The value of the specified OEE configuration key.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 key:
 *                   type: string
 *       404:
 *         description: Key not found.
 */
router.get('/:key', (req, res) => {
    try {
        const oeeConfig = loadOEEConfig();
        const key = req.params.key;
        if (oeeConfig[key] !== undefined) {
            res.json({
                key,
                ...oeeConfig[key]
            });
        } else {
            res.status(404).json({ message: `Key ${key} not found` });
        }
    } catch (error) {
        console.error('Error loading OEE configuration:', error);
        res.status(500).json({ message: 'Failed to retrieve the key' });
    }
});

/**
 * @swagger
 * /oeeconfig:
 *   post:
 *     summary: Add a new OEE configuration
 *     tags: [OEE Configuration]
 *     description: Add a new key-value pair to the OEE configuration.
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
 *         description: New OEE configuration added successfully.
 */
router.post('/', (req, res) => {
    try {
        const oeeConfig = loadOEEConfig();
        const newConfig = req.body;
        for (let key in newConfig) {
            oeeConfig[key] = newConfig[key];
        }
        saveOEEConfig(oeeConfig);
        res.status(201).json({ message: 'New OEE configuration added successfully' });
    } catch (error) {
        console.error('Error adding OEE configuration:', error);
        res.status(500).json({ message: 'Failed to add OEE configuration' });
    }
});

/**
 * @swagger
 * /oeeconfig/{key}:
 *   put:
 *     summary: Update an existing OEE configuration
 *     tags: [OEE Configuration]
 *     description: Update the value of a specific OEE configuration key.
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: The OEE configuration key to update.
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
 *         description: OEE configuration updated successfully.
 *       404:
 *         description: Key not found.
 */
router.put('/:key', (req, res) => {
    try {
        const oeeConfig = loadOEEConfig();
        const key = req.params.key;
        const value = req.body.value;
        if (oeeConfig[key] !== undefined) {
            oeeConfig[key] = value;
            saveOEEConfig(oeeConfig);
            res.status(200).json({ message: `Key ${key} updated successfully` });
        } else {
            res.status(404).json({ message: `Key ${key} not found` });
        }
    } catch (error) {
        console.error('Error updating OEE configuration:', error);
        res.status(500).json({ message: 'Failed to update the key' });
    }
});

/**
 * @swagger
 * /oeeconfig/{key}:
 *   delete:
 *     summary: Delete a specific OEE configuration
 *     tags: [OEE Configuration]
 *     description: Remove a key-value pair from the OEE configuration.
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: The OEE configuration key to delete.
 *     responses:
 *       200:
 *         description: Key deleted successfully.
 *       404:
 *         description: Key not found.
 */
router.delete('/:key', (req, res) => {
    try {
        const oeeConfig = loadOEEConfig();
        const key = req.params.key;
        if (oeeConfig[key] !== undefined) {
            delete oeeConfig[key];
            saveOEEConfig(oeeConfig);
            res.status(200).json({ message: `Key ${key} deleted successfully` });
        } else {
            res.status(404).json({ message: `Key ${key} not found` });
        }
    } catch (error) {
        console.error('Error deleting OEE configuration:', error);
        res.status(500).json({ message: 'Failed to delete the key' });
    }
});

module.exports = router;
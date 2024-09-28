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
 *     description: Retrieve the entire OEE configuration as a JSON object.
 *     responses:
 *       200:
 *         description: The entire OEE configuration.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/', (req, res) => {
    const oeeConfig = loadOEEConfig();
    res.json(oeeConfig);
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
    const oeeConfig = loadOEEConfig();
    const key = req.params.key;
    if (oeeConfig[key] !== undefined) {
        res.json({
            [key]: oeeConfig[key]
        });
    } else {
        res.status(404).json({ message: `Key ${key} not found` });
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
    const oeeConfig = loadOEEConfig();
    const newConfig = req.body;
    for (let key in newConfig) {
        oeeConfig[key] = newConfig[key];
    }
    saveOEEConfig(oeeConfig);
    res.status(201).json({ message: 'New OEE configuration added successfully' });
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
    const oeeConfig = loadOEEConfig();
    const key = req.params.key;
    if (oeeConfig[key] !== undefined) {
        delete oeeConfig[key];
        saveOEEConfig(oeeConfig);
        res.status(200).json({ message: `Key ${key} deleted successfully` });
    } else {
        res.status(404).json({ message: `Key ${key} not found` });
    }
});

module.exports = router;
const express = require('express'); // Import the express module
const path = require('path'); // Import the path module
const fs = require('fs').promises; // Import the fs module with promises API

const router = express.Router(); // Create a new router object
const structurePath = path.join(__dirname, '../config/structure.json'); // Define the path to the structure configuration file

/**
 * @swagger
 * tags:
 *   name: Structure
 *   description: API for managing the structure configuration
 */

/**
 * @swagger
 * /structure:
 *   get:
 *     summary: Fetch the structure configuration
 *     tags: [Structure]
 *     description: Reads the configuration from the structure.json file and sends it as a response.
 *     responses:
 *       200:
 *         description: The structure configuration.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/', async(req, res, next) => {
    try {
        const data = await fs.readFile(structurePath, 'utf8'); // Read the structure configuration file
        res.send(data); // Send the file content as a response
    } catch (error) {
        next(error); // Pass any errors to the error handler middleware
    }
});

/**
 * @swagger
 * /structure:
 *   post:
 *     summary: Update the structure configuration
 *     tags: [Structure]
 *     description: Writes the new configuration to the structure.json file.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Structure configuration saved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post('/', async(req, res, next) => {
    try {
        const newData = JSON.stringify(req.body, null, 2); // Convert the request body to a formatted JSON string
        await fs.writeFile(structurePath, newData, 'utf8'); // Write the new data to the structure configuration file
        res.json({ message: 'structure.json saved successfully' }); // Send a success message as a response
    } catch (error) {
        next(error); // Pass any errors to the error handler middleware
    }
});

module.exports = router; // Export the router object for use in other files
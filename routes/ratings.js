const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const configPath = path.join(__dirname, '../config/config.json');

/**
 * Helper function to load the config file.
 */
const loadConfig = () => {
    const data = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(data);
};

/**
 * Helper function to save the config file.
 */
const saveConfig = (config) => {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
};

/**
 * @swagger
 * tags:
 *   name: Ratings
 *   description: API for managing ratings
 */

/**
 * @swagger
 * /ratings:
 *   get:
 *     summary: Get all ratings
 *     tags: [Ratings]
 *     description: Retrieve a list of all ratings.
 *     responses:
 *       200:
 *         description: A list of ratings.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/', (req, res) => {
    const config = loadConfig();
    res.json(config.ratings);
});

/**
 * @swagger
 * /ratings/{id}:
 *   get:
 *     summary: Get a specific rating by ID
 *     tags: [Ratings]
 *     description: Retrieve a single rating by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The rating ID.
 *     responses:
 *       200:
 *         description: A rating object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Rating not found.
 */
router.get('/:id', (req, res) => {
    const config = loadConfig();
    const ratingId = parseInt(req.params.id, 10);
    const rating = config.ratings.find(r => r.id === ratingId);

    if (rating) {
        res.json(rating);
    } else {
        res.status(404).json({ message: `Rating with ID ${ratingId} not found` });
    }
});

/**
 * @swagger
 * /ratings:
 *   post:
 *     summary: Add a new rating
 *     tags: [Ratings]
 *     description: Create a new rating.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               description:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       201:
 *         description: Rating created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.post('/', (req, res) => {
    const config = loadConfig();
    const newRating = req.body;
    config.ratings.push(newRating);
    saveConfig(config);
    res.status(201).json({ message: 'Rating created successfully', rating: newRating });
});

/**
 * @swagger
 * /ratings/{id}:
 *   put:
 *     summary: Update an existing rating
 *     tags: [Ratings]
 *     description: Update the details of an existing rating.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The rating ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rating updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Rating not found.
 */
router.put('/:id', (req, res) => {
    const config = loadConfig();
    const ratingId = parseInt(req.params.id, 10);
    const updatedRating = req.body;
    const index = config.ratings.findIndex(r => r.id === ratingId);

    if (index !== -1) {
        config.ratings[index] = {...config.ratings[index], ...updatedRating };
        saveConfig(config);
        res.status(200).json({ message: 'Rating updated successfully', rating: config.ratings[index] });
    } else {
        res.status(404).json({ message: `Rating with ID ${ratingId} not found` });
    }
});

/**
 * @swagger
 * /ratings/{id}:
 *   delete:
 *     summary: Delete a rating
 *     tags: [Ratings]
 *     description: Remove a rating from the list.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The rating ID.
 *     responses:
 *       200:
 *         description: Rating deleted successfully.
 *       404:
 *         description: Rating not found.
 */
router.delete('/:id', (req, res) => {
    const config = loadConfig();
    const ratingId = parseInt(req.params.id, 10);
    const initialLength = config.ratings.length;
    config.ratings = config.ratings.filter(r => r.id !== ratingId);

    if (config.ratings.length !== initialLength) {
        saveConfig(config);
        res.status(200).json({ message: 'Rating deleted successfully' });
    } else {
        res.status(404).json({ message: `Rating with ID ${ratingId} not found` });
    }
});

module.exports = router;
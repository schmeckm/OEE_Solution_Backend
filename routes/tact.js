const express = require('express'); // Import the express module
const path = require('path'); // Import the path module
const fs = require('fs').promises; // Import the fs module with promises API
const { param, body, validationResult } = require('express-validator'); // Import validation functions
const router = express.Router(); // Create a new router object

const configPath = path.join(__dirname, '../data/tact.json');

// Async function to load tact data
async function loadTactData() {
    try {
        const data = await fs.readFile(configPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        throw new Error('Failed to load tact data');
    }
}

// Async function to save tact data
async function saveTactData(data) {
    try {
        await fs.writeFile(configPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        throw new Error('Failed to save tact data');
    }
}

/**
 * @swagger
 * tags:
 *   name: Tact
 *   description: API for managing Tact data. It defined how fast the machine is allowed to run for that specific material
 */

/**
 * @swagger
 * /tact:
 *   get:
 *     summary: Get all tact entries
 *     tags: [Tact]
 *     description: Retrieve a list of all tact entries.
 *     responses:
 *       200:
 *         description: A list of tact entries.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/', async(req, res) => {
    try {
        const tactData = await loadTactData(); // Load all tact data
        res.json(tactData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /tact/{id}:
 *   get:
 *     summary: Get a specific tact entry by ID
 *     tags: [Tact]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         description: The tact ID.
 *     responses:
 *       200:
 *         description: A tact entry object.
 *       404:
 *         description: Tact entry not found.
 */
router.get('/:id', param('id').isInt(), async(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const tactData = await loadTactData();
        const tact = tactData.find(t => t.id === parseInt(req.params.id));

        if (tact) {
            res.json(tact);
        } else {
            res.status(404).json({ message: `Tact entry with ID ${req.params.id} not found` });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /tact:
 *   post:
 *     summary: Create a new tact entry
 *     tags: [Tact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               machine:
 *                 type: string
 *               material:
 *                 type: string
 *               sollMax:
 *                 type: number
 *               sollMin:
 *                 type: number
 *     responses:
 *       201:
 *         description: Tact entry created successfully.
 */
router.post(
    '/',
    body('machine').notEmpty(),
    body('material').notEmpty(),
    body('sollMax').isNumeric(),
    body('sollMin').isNumeric(),
    async(req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const tactData = await loadTactData();
            const newTact = {
                id: tactData.length ? Math.max(...tactData.map(t => t.id)) + 1 : 1,
                machine: req.body.machine,
                material: req.body.material,
                sollMax: req.body.sollMax,
                sollMin: req.body.sollMin
            };

            tactData.push(newTact);
            await saveTactData(tactData);
            res.status(201).json({ message: 'Tact entry created successfully', tact: newTact });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * @swagger
 * /tact/{id}:
 *   put:
 *     summary: Update an existing tact entry
 *     tags: [Tact]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               machine:
 *                 type: string
 *               material:
 *                 type: string
 *               sollMax:
 *                 type: number
 *               sollMin:
 *                 type: number
 *     responses:
 *       200:
 *         description: Tact entry updated successfully.
 */
router.put('/:id', param('id').isInt(), async(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const tactData = await loadTactData();
        const index = tactData.findIndex(t => t.id === parseInt(req.params.id));

        if (index !== -1) {
            tactData[index] = {...tactData[index], ...req.body };
            await saveTactData(tactData);
            res.status(200).json({ message: 'Tact entry updated successfully', tact: tactData[index] });
        } else {
            res.status(404).json({ message: `Tact entry with ID ${req.params.id} not found` });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /tact/{id}:
 *   delete:
 *     summary: Delete a tact entry
 *     tags: [Tact]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Tact entry deleted successfully.
 */
router.delete('/:id', param('id').isInt(), async(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        let tactData = await loadTactData();
        const initialLength = tactData.length;
        tactData = tactData.filter(t => t.id !== parseInt(req.params.id));

        if (tactData.length !== initialLength) {
            await saveTactData(tactData);
            res.status(200).json({ message: 'Tact entry deleted successfully' });
        } else {
            res.status(404).json({ message: `Tact entry with ID ${req.params.id} not found` });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; // Export the router for use in other parts
const express = require('express');
const path = require('path');
const { ratings } = require('../config/config'); // Import ratings from config

const router = express.Router();

// Serve index.html at the root
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Endpoint to get timezone from .env
router.get('/timezone', (req, res) => {
    res.send(process.env.TIMEZONE || 'UTC');
});

// Endpoint to get rating labels
router.get('/ratings', (req, res) => {
    res.json(ratings);
});

module.exports = router;
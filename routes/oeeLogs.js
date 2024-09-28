const express = require('express');
const fs = require('fs').promises;

const router = express.Router();
const logFilePath = './oee-calculator.log'; // Ensure the path is correct and points to the root

router.get('/', async(req, res, next) => {
    try {
        const data = await fs.readFile(logFilePath, 'utf8');
        const logs = data.split('\n').filter(line => line).map(line => {
            try {
                return JSON.parse(line);
            } catch (err) {
                return null;
            }
        }).filter(log => log !== null && log.level === 'info' && log.message.includes('Decoded message from topic'));
        res.json(logs);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
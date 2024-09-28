const express = require('express');
const { loadErrors, saveErrors } = require('../data/error.json'); // Import the error service

const router = express.Router();

// API zum Abrufen aller Fehler
router.get('/errors', (req, res) => {
    const errors = loadErrors();
    res.json(errors);
});

// API zum Abrufen eines spezifischen Fehlers
router.get('/errors/:id', (req, res) => {
    const errors = loadErrors();
    const id = req.params.id;
    const error = errors.find(err => err.error_id === id);
    if (error) {
        res.json(error);
    } else {
        res.status(404).json({ message: `Error with ID ${id} not found` });
    }
});

// API zum Hinzufügen eines neuen Fehlers
router.post('/errors', (req, res) => {
    const errors = loadErrors();
    const newError = req.body;
    errors.push(newError);
    saveErrors(errors);
    res.status(201).json({ message: 'New error added successfully' });
});

// API zum Aktualisieren eines bestehenden Fehlers
router.put('/errors/:id', (req, res) => {
    const errors = loadErrors();
    const id = req.params.id;
    const index = errors.findIndex(err => err.error_id === id);
    if (index !== -1) {
        errors[index] = req.body;
        saveErrors(errors);
        res.status(200).json({ message: `Error with ID ${id} updated successfully` });
    } else {
        res.status(404).json({ message: `Error with ID ${id} not found` });
    }
});

// API zum Löschen eines spezifischen Fehlers
router.delete('/errors/:id', (req, res) => {
    const errors = loadErrors();
    const id = req.params.id;
    const filteredErrors = errors.filter(err => err.error_id !== id);
    if (filteredErrors.length !== errors.length) {
        saveErrors(filteredErrors);
        res.status(200).json({ message: `Error with ID ${id} deleted successfully` });
    } else {
        res.status(404).json({ message: `Error with ID ${id} not found` });
    }
});

module.exports = router;
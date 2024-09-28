const fs = require('fs');
const path = require('path');

const MICROSTOPS_FILE = path.join(__dirname, '../data/microstops.json');

// Hilfsfunktion zum Laden der Microstops
const loadMicroStops = () => {
    if (fs.existsSync(MICROSTOPS_FILE)) {
        const data = fs.readFileSync(MICROSTOPS_FILE, 'utf8');
        return JSON.parse(data);
    } else {
        return [];
    }
};

// Hilfsfunktion zum Speichern der Microstops
const saveMicroStops = (microstops) => {
    fs.writeFileSync(MICROSTOPS_FILE, JSON.stringify(microstops, null, 4));
};

module.exports = {
    loadMicroStops,
    saveMicroStops
};
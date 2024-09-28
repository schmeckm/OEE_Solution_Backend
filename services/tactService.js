const fs = require('fs');
const path = require('path');
const tactFilePath = path.join(__dirname, '../data/tact.json');

// Load Tact Data
function loadTactData() {
    const data = fs.readFileSync(tactFilePath, 'utf-8');
    return JSON.parse(data);
}

// Save Tact Data
function saveTactData(data) {
    fs.writeFileSync(tactFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { loadTactData, saveTactData };
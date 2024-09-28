const fs = require('fs');
const path = require('path');

const SHIFT_MODELS_FILE = path.join(__dirname, '../data/shiftModel.json');

// Function to load all shift models
const loadShiftModels = () => {
    if (fs.existsSync(SHIFT_MODELS_FILE)) {
        const data = fs.readFileSync(SHIFT_MODELS_FILE, 'utf8');
        return JSON.parse(data);
    } else {
        return [];
    }
};

// Function to load shift models by machine ID
const loadShiftModelsByMachineId = (machineId) => {
    const shiftModels = loadShiftModels();
    return shiftModels.filter(sm => sm.machine_id === machineId);
};

// Function to save shift models
const saveShiftModels = (shiftModels) => {
    fs.writeFileSync(SHIFT_MODELS_FILE, JSON.stringify(shiftModels, null, 4));
};

module.exports = {
    loadShiftModels,
    loadShiftModelsByMachineId, // Export the function here
    saveShiftModels,
};
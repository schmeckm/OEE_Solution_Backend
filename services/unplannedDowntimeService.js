const path = require("path");
const fs = require("fs").promises;

const filePath = path.resolve(__dirname, "../data/unplannedDowntime.json");

// Utility function to validate data structure
function validateDowntimeData(data) {
    if (!Array.isArray(data)) {
        throw new Error("Loaded data is not an array");
    }
}

// Load unplanned downtimes from the JSON file
async function loadUnplannedDowntime() {
    try {
        // Check if the file exists
        await fs.access(filePath);

        // Read the file and parse the JSON data
        const data = await fs.readFile(filePath, "utf8");
        const parsedData = JSON.parse(data);

        // Validate the structure of the loaded data
        validateDowntimeData(parsedData);
        return parsedData;
    } catch (error) {
        console.error(`Failed to load data from ${filePath}: ${error.message}`);
        // Return an empty array in case of error
        return [];
    }
}

// Save unplanned downtimes to the JSON file
async function saveUnplannedDowntime(data) {
    if (!Array.isArray(data)) {
        throw new Error("Data to be saved is not an array");
    }

    try {
        // Save the data as a formatted JSON file
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Failed to save data to ${filePath}: ${error.message}`);
    }
}

// Get unplanned downtimes by Process Order Number
async function getUnplannedDowntimeByProcessOrderNumber(processOrderNumber) {
    const data = await loadUnplannedDowntime();
    // Ensure the comparison is consistent by converting both to strings
    return data.filter(
        (downtime) => downtime.ProcessOrderNumber?.toString() === processOrderNumber.toString()
    );
}

// Get unplanned downtimes by Machine ID
async function getUnplannedDowntimeByMachineId(machineId) {
    const data = await loadUnplannedDowntime();
    return data.filter((downtime) => downtime.machine_id === machineId);
}

module.exports = {
    loadUnplannedDowntime,
    saveUnplannedDowntime,
    getUnplannedDowntimeByProcessOrderNumber,
    getUnplannedDowntimeByMachineId,
};

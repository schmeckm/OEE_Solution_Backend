const fs = require('fs');
const path = require('path');

const PLANNED_DOWNTIME_FILE = path.join(__dirname, '../data/plannedDowntime.json');

// Hilfsfunktion zum Laden der geplanten Ausfallzeiten
const loadPlannedDowntime = () => {
    if (fs.existsSync(PLANNED_DOWNTIME_FILE)) {
        const data = fs.readFileSync(PLANNED_DOWNTIME_FILE, 'utf8');
        return JSON.parse(data);
    } else {
        return [];
    }
};

// Hilfsfunktion zum Speichern der geplanten Ausfallzeiten
const savePlannedDowntime = (downtimes) => {
    fs.writeFileSync(PLANNED_DOWNTIME_FILE, JSON.stringify(downtimes, null, 4));
};

// Hilfsfunktion zum Abrufen der geplanten Ausfallzeiten nach Prozessauftragsnummer
const getPlannedDowntimeByProcessOrderNumber = (processOrderNumber) => {
    const downtimes = loadPlannedDowntime();
    return downtimes.filter(downtime => downtime.ProcessOrderNumber === processOrderNumber);
};

// Hilfsfunktion zum Abrufen der geplanten Ausfallzeiten nach Maschinen-ID
const getPlannedDowntimeByMachineId = (machineId) => {
    const downtimes = loadPlannedDowntime();
    return downtimes.filter(downtime => downtime.machine_id === machineId);
};

module.exports = {
    loadPlannedDowntime,
    savePlannedDowntime,
    getPlannedDowntimeByProcessOrderNumber,
    getPlannedDowntimeByMachineId
};
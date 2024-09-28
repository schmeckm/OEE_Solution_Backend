const fs = require("fs");
const path = require("path");

const MACHINE_FILE = path.join(__dirname, "../data/machine.json");

// Cache-Variablen
let machineCache = null;
let lastModifiedTime = 0;

/**
 * Hilfsfunktion zum Laden der Maschinen mit Caching.
 * Verwendet einen einfachen Cache-Mechanismus, um die Maschineninformationen nur neu zu laden,
 * wenn die Datei seit dem letzten Laden geändert wurde.
 */
const loadMachines = () => {
    if (fs.existsSync(MACHINE_FILE)) {
        // Überprüfen, ob die Datei seit dem letzten Laden geändert wurde
        const stats = fs.statSync(MACHINE_FILE);
        const modifiedTime = stats.mtimeMs;

        // Wenn die Datei nicht geändert wurde, verwenden wir den Cache
        if (machineCache && lastModifiedTime === modifiedTime) {
            return machineCache;
        }

        // Datei neu laden und Cache aktualisieren, wenn sie geändert wurde
        const data = fs.readFileSync(MACHINE_FILE, "utf8");
        machineCache = JSON.parse(data);
        lastModifiedTime = modifiedTime;

        return machineCache;
    } else {
        // Wenn die Datei nicht existiert, eine leere Liste zurückgeben
        return [];
    }
};

/**
 * Hilfsfunktion zum Speichern der Maschineninformationen und Aktualisieren des Caches.
 * Schreibt die Maschineninformationen in die Datei und aktualisiert den Cache sowie den letzten Änderungszeitpunkt.
 */
const saveMachines = (machines) => {
    fs.writeFileSync(MACHINE_FILE, JSON.stringify(machines, null, 4));

    // Cache und letzten Änderungszeitpunkt aktualisieren
    machineCache = machines;
    lastModifiedTime = fs.statSync(MACHINE_FILE).mtimeMs;
};

module.exports = {
    loadMachines,
    saveMachines,
};
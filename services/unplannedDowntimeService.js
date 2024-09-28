const path = require("path");
const fs = require("fs").promises;

const filePath = path.resolve(__dirname, "../data/unplannedDowntime.json");

async function loadUnplannedDowntime() {
  try {
    // Überprüfen, ob die Datei existiert
    await fs.access(filePath);

    // Datei lesen und JSON parsen
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading unplanned downtime data: ${error.message}`);

    // Falls ein Fehler auftritt, z.B. die Datei existiert nicht, wird ein leeres Array zurückgegeben
    return [];
  }
}

async function saveUnplannedDowntime(data) {
  try {
    // JSON-Datei speichern
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving unplanned downtime data: ${error.message}`);
  }
}

async function getUnplannedDowntimeByProcessOrderNumber(processOrderNumber) {
  const data = await loadUnplannedDowntime();
  return data.filter(
    (downtime) => downtime.ProcessOrderNumber === processOrderNumber
  );
}

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

const path = require("path");
const { oeeLogger, errorLogger } = require("../utils/logger");
const { writeOEEToInfluxDB } = require("../services/oeeMetricsService");
const {
    loadMachineData,
    loadDataAndPrepareOEE,
    loadProcessOrderDataByMachine,
} = require("./dataLoader");
const { influxdb } = require("../config/config");
const OEECalculator = require("./oeeCalculator");
const {
    setWebSocketServer,
    sendWebSocketMessage,
} = require("../websocket/webSocketUtils");

const UNKNOWN_VALUES = {
    PLANT: 'UnknownPlant',
    AREA: 'UnknownArea',
    LINE: 'UnknownLine'
};

const oeeCalculators = new Map(); // Map to store OEE calculators per machine ID
let metricBuffers = new Map(); // Buffer to store metrics per machine
let logCallCount = 0; // Zählvariable für die Aufrufe

function logTabularData(metrics) {
    const {
        lineId = UNKNOWN_VALUES.LINE,
            oee = 0,
            availability = 0,
            performance = 0,
            quality = 0,
            PlannedProductionQuantity = 0,
            ActualProductionQuantity = 0,
            ActualProductionYield = 0,
            plannedDurationMinutes = 0,
            plannedTakt = 0,
            actualTakt = 0,
            setupTime = 0,
            teardownTime = 0,
            classification = "N/A",
    } = metrics;

    logCallCount++;
    console.log(`Aufruf Nummer: ${logCallCount}`);

    const logTable = `
  +-----------------------------------------------+-------------------+
  | Metric                                        | Value             |
  +-----------------------------------------------+-------------------+
  | Machine                                       | ${lineId.padEnd(2)}          |
  | Availability (%)                              | ${availability.toFixed(2).padStart(6)}%           |
  | Performance (%)                               | ${performance.toFixed(2).padStart(6)}%           |
  | Quality (%)                                   | ${quality.toFixed(2).padStart(6)}%           |
  | OEE (%)                                       | ${oee.toFixed(2).padStart(6)}%           |
  | Classification                                | ${classification.padEnd(2)}     |
  | Planned Production Quantity                   | ${PlannedProductionQuantity.toString().padStart(6)}            |
  | Actual Production Quantity                    | ${ActualProductionQuantity.toString().padStart(6)}            |
  | Actual Yield Quantity                         | ${ActualProductionYield.toString().padStart(6)}            |
  | Production Time (Min)                         | ${plannedDurationMinutes.toString().padStart(6)}            |
  | Setup Time (Min)                              | ${setupTime.toString().padStart(6)}            |
  | Teardown Time (Min)                           | ${teardownTime.toString().padStart(6)}            |
  | Planned Takt (Min/unit)                       | ${plannedTakt.toFixed(2).padStart(6)}            |
  | Actual Takt (Min/unit)                        | ${actualTakt.toFixed(2).padStart(6)}            |
  +-----------------------------------------------+-------------------+
  `;
    console.log(`\n--- OEE Metrics for Machine: ${lineId} ---`);
    console.log(logTable);
}

async function getPlantAndArea(machineId) {
    try {
        const machines = await loadMachineData();
        const machine = machines.find((m) => m.machine_id === machineId);

        return {
            plant: machine && machine.Plant ? machine.Plant : UNKNOWN_VALUES.PLANT,
            area: machine && machine.area ? machine.area : UNKNOWN_VALUES.AREA,
            lineId: machine && machine.name ? machine.name : UNKNOWN_VALUES.LINE,
        };

    } catch (error) {
        errorLogger.error(`Error retrieving plant and area for machineId ${machineId}: ${error.message}`);
        return {
            plant: UNKNOWN_VALUES.PLANT,
            area: UNKNOWN_VALUES.AREA,
            lineId: UNKNOWN_VALUES.LINE,
        };
    }
}

async function updateMetric(name, value, machineId) {
    try {
        if (!metricBuffers.has(machineId)) {
            metricBuffers.set(machineId, {}); // Initialize buffer if it doesn't exist
        }

        const buffer = metricBuffers.get(machineId);
        oeeLogger.info(`Updating buffer for machine ${machineId}:`, buffer);

        // Überprüfen, ob der neue Wert anders ist als der gespeicherte Wert
        if (buffer[name] !== value) {
            buffer[name] = value; // Aktualisiere den Wert im Puffer
            await processMetrics(machineId, buffer); // Verarbeite die Metriken
        } else {
            console.log(`No change detected for ${name}.`); // Logge, wenn es keine Änderung gibt
        }

        logMetricBuffer(); // Protokolliere den aktuellen Puffer

    } catch (error) {
        errorLogger.error(`Error updating metric ${name} for machineId ${machineId}: ${error.message}`);
    }
}

async function processMetrics(machineId, buffer) {
    try {
        let calculator = oeeCalculators.get(machineId);
        if (!calculator) {
            calculator = new OEECalculator();
            await calculator.init(machineId);
            oeeCalculators.set(machineId, calculator);
        }

        const { plant, area, lineId } = await getPlantAndArea(machineId);

        calculator.oeeData[machineId] = {
            ...calculator.oeeData[machineId],
            plant,
            area,
            lineId,
            ...buffer, // Add the buffer data to the oeeData object
        };

        const processOrderData = await loadProcessOrderDataByMachine(machineId);
        if (!processOrderData || processOrderData.length === 0) {
            throw new Error(`No active process order found for machine ${machineId}`);
        }

        const processOrder = processOrderData[0];
        const OEEData = await loadDataAndPrepareOEE(machineId);
        validateOEEData(OEEData);

        const totalTimes = calculateTotalTimes(OEEData.datasets);
        validateInputData(totalTimes, machineId);

        const ActualProductionQuantity =
            (buffer && buffer.ActualProductionQuantity) || 0; // Fallback auf 0, wenn der Wert nicht existiert

        const ActualProductionYield =
            (buffer && buffer.ActualProductionYield) || 0; // Fallback auf 0, wenn der Wert nicht existiert

        // Protokolliere die Werte, bevor die Berechnung beginnt
        oeeLogger.log(`Calculating metrics for machineId ${machineId} with values:`, {
            UnplannedDowntime: totalTimes.UnplannedDowntime,
            plannedDowntime: totalTimes.plannedDowntime + totalTimes.breakTime + totalTimes.microstops,
            ActualProductionQuantity,
            ActualProductionYield,
            processOrder
        });

        // Berechne die Metriken fortlaufend
        await calculator.calculateMetrics(
            machineId,
            totalTimes.UnplannedDowntime,
            totalTimes.plannedDowntime + totalTimes.breakTime + totalTimes.microstops,
            ActualProductionQuantity,
            ActualProductionYield,
            processOrder
        );

        const metrics = calculator.getMetrics(machineId);

        // Protokolliere die berechneten Metriken
        oeeLogger.info(`Metrics for machineId ${machineId}:`, metrics);

        if (!metrics) {
            throw new Error(`Metrics could not be calculated for machineId: ${machineId}.`);
        }

        logTabularData(metrics);

        // Schreibe die Metriken nur in die InfluxDB, wenn der Prozessauftrag abgeschlossen ist
        const isOrderCompleted =
            processOrder.ProcessOrderStatus === 'COMPLETED' ||
            processOrder.ActualProcessOrderEnd; // Überprüfe, ob der Auftrag beendet ist

        if (isOrderCompleted) {
            if (influxdb.url && influxdb.token && influxdb.org && influxdb.bucket) {
                await writeOEEToInfluxDB(metrics); // Schreibe nur am Ende in die InfluxDB
                oeeLogger.debug("Metrics written to InfluxDB.");
            }
        } else {
            oeeLogger.info(`Process Order for machine ${machineId} is not completed. InfluxDB write skipped.`);
        }

        // WebSocket-Nachricht nur senden, wenn WEBSOCKET=true ist
        if (process.env.WEBSOCKET === 'true') {
            sendWebSocketMessage("OEEData", metrics);
            oeeLogger.info("OEE data sent to WebSocket clients.");
        } else {
            oeeLogger.info("WebSocket is disabled, skipping data send.");
        }

    } catch (error) {
        errorLogger.error(`Error calculating metrics for machine ${machineId}: ${error.message}`);
    }
}

function logMetricBuffer() {
    oeeLogger.info("Current state of metric buffers:");
    metricBuffers.forEach((buffer, machineId) => {
        oeeLogger.warn(`Machine ID: ${machineId}`);
        Object.keys(buffer).forEach((metricName) => {
            oeeLogger.warn(`  ${metricName}: ${buffer[metricName]}`);
        });
    });
}

function calculateTotalTimes(datasets) {
    return datasets.reduce((totals, dataset, index) => {
        const total = dataset.data.reduce((a, b) => a + b, 0);
        switch (index) {
            case 0:
                totals.productionTime = total;
                break;
            case 1:
                totals.breakTime = total;
                break;
            case 2:
                totals.UnplannedDowntime = total;
                break;
            case 3:
                totals.plannedDowntime = total;
                break;
            case 4:
                totals.microstops = total;
                break;
            default:
                break;
        }
        return totals;
    }, {
        productionTime: 0,
        breakTime: 0,
        UnplannedDowntime: 0,
        plannedDowntime: 0,
        microstops: 0,
    });
}

function validateInputData(totalTimes, machineId) {
    const { UnplannedDowntime, plannedDowntime, productionTime } = totalTimes;

    if (productionTime <= 0) {
        throw new Error(`Invalid input data for machine ${machineId}: productionTime must be greater than 0`);
    }

    if (UnplannedDowntime < 0 || plannedDowntime < 0) {
        throw new Error(`Invalid input data for machine ${machineId}: downtime values must be non-negative`);
    }
}

async function getOEEMetrics(machineId) {
    // Buffer-Daten aus dem Cache (metricBuffers) laden
    const buffer = metricBuffers.get(machineId);

    if (!buffer) {
        return null; // Kein Buffer vorhanden
    }

    // Berechne die OEE-Daten, indem du `processMetrics` aufrufst
    await processMetrics(machineId, buffer);

    // Die berechneten Metriken aus der Funktion `processMetrics` holen
    const calculator = oeeCalculators.get(machineId);
    if (!calculator) {
        return null; // Kein OEE-Calculator für die Maschine gefunden
    }

    const metrics = calculator.getMetrics(machineId);
    return metrics; // Rückgabe der vollständigen OEE-Daten
}

function validateOEEData(OEEData) {
    if (!OEEData || !Array.isArray(OEEData.datasets) || !OEEData.labels) {
        throw new Error("Invalid OEEData format.");
    }
}

module.exports = { updateMetric, processMetrics, setWebSocketServer, getOEEMetrics };
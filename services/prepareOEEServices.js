const {
    checkForRunningOrder,
    loadPlannedDowntimeData,
    loadUnplannedDowntimeData,
    loadMicrostops,
    loadShiftModelData,
    filterAndCalculateDurations,
} = require("../src/dataLoader");
const { oeeLogger, errorLogger } = require("../utils/logger");
const moment = require("moment");

const cache = {}; // Cache-Objekt zur Speicherung der Daten

// 2. Datenabruf und -verarbeitung
async function loadDataAndPrepareOEE(machineId) {
    if (!machineId) {
        throw new Error("MachineId is required to load and prepare OEE data.");
    }

    // Überprüfe, ob die Daten bereits im Cache sind
    if (cache[machineId]) {
        oeeLogger.info(`Returning cached OEE data for machineId ${machineId}`);
        return cache[machineId];
    }

    try {
        // Überprüfe, ob es einen laufenden Prozessauftrag gibt
        const currentProcessOrder = await checkForRunningOrder(machineId);
        if (!currentProcessOrder) {
            throw new Error(
                `No running process orders found for machineId: ${machineId}`
            );
        }

        // Bestimme die Start- und Endzeiten des Prozessauftrags
        const processOrderStartTime = moment(currentProcessOrder.Start);
        const processOrderEndTime = moment(currentProcessOrder.End);

        // 3. Abruf der notwendigen Daten für die Berechnungen
        const [
            plannedDowntimeData,
            unplannedDowntimeData,
            microstopsData,
            shiftModels,
        ] = await Promise.all([
            loadPlannedDowntimeData(),
            loadUnplannedDowntimeData(),
            loadMicrostops(),
            loadShiftModelData(machineId),
        ]);

        // Filtere und bereite die Ausfallzeiten-Daten vor
        const filterDowntimeData = (downtimeData) => {
            return downtimeData.filter(
                (downtime) =>
                downtime.machine_id === machineId &&
                moment(downtime.End).isAfter(processOrderStartTime) &&
                moment(downtime.Start).isBefore(processOrderEndTime)
            );
        };

        const filteredPlannedDowntime = filterDowntimeData(plannedDowntimeData);
        const filteredUnplannedDowntime = filterDowntimeData(unplannedDowntimeData);
        const filteredMicrostops = filterDowntimeData(microstopsData);

        oeeLogger.debug(
            `Filtered planned downtime data: ${JSON.stringify(
        filteredPlannedDowntime
      )}`
        );
        oeeLogger.debug(
            `Filtered unplanned downtime data: ${JSON.stringify(
        filteredUnplannedDowntime
      )}`
        );
        oeeLogger.debug(
            `Filtered microstops data: ${JSON.stringify(filteredMicrostops)}`
        );

        // Berechne die Dauer für die OEE-Berechnungen
        const durations = filterAndCalculateDurations(
            currentProcessOrder,
            filteredPlannedDowntime,
            filteredUnplannedDowntime,
            filteredMicrostops,
            shiftModels
        );

        // 4. Aufbau des OEEData-Objekts
        const OEEData = {
            labels: [],
            datasets: [
                { label: "Production", data: [], backgroundColor: "green" },
                { label: "Break", data: [], backgroundColor: "blue" },
                { label: "Unplanned Downtime", data: [], backgroundColor: "red" },
                { label: "Planned Downtime", data: [], backgroundColor: "orange" },
                { label: "Microstops", data: [], backgroundColor: "purple" },
            ],
            processOrder: currentProcessOrder, // Füge die Prozessauftragsdaten hinzu
        };

        // 5. Verarbeitung der Zeitintervalle und Zuordnung der Daten
        let currentTime = processOrderStartTime.clone().startOf("hour");
        const orderEnd = processOrderEndTime.clone().endOf("hour");

        while (currentTime.isBefore(orderEnd)) {
            const nextTime = currentTime.clone().add(1, "hour");

            if (OEEData.labels.includes(currentTime.toISOString())) {
                oeeLogger.warn(
                    `Duplicate interval detected: ${currentTime.toISOString()} - Skipping this interval.`
                );
                currentTime = nextTime;
                continue;
            }

            OEEData.labels.push(currentTime.toISOString());

            let productionTime = nextTime.diff(currentTime, "minutes");
            let breakTime = 0;
            let unplannedDowntime = 0;
            let plannedDowntime = 0;
            let microstopTime = 0;

            // Berechne die verschiedenen Ausfallzeiten und Pausen
            calculateDowntimes(
                filteredPlannedDowntime,
                filteredUnplannedDowntime,
                filteredMicrostops,
                shiftModels,
                currentTime,
                nextTime,
                (planned, unplanned, microstops, breaks) => {
                    plannedDowntime += planned;
                    unplannedDowntime += unplanned;
                    microstopTime += microstops;
                    breakTime += breaks;
                }
            );

            const totalNonProductionTime =
                breakTime + unplannedDowntime + plannedDowntime + microstopTime;
            productionTime = Math.max(0, productionTime - totalNonProductionTime);

            oeeLogger.debug(
                `Interval ${currentTime.format("HH:mm")} - ${nextTime.format("HH:mm")}:`
            );
            oeeLogger.debug(`  Production time: ${productionTime} minutes`);
            oeeLogger.debug(`  Break time: ${breakTime} minutes`);
            oeeLogger.debug(`  Unplanned downtime: ${unplannedDowntime} minutes`);
            oeeLogger.debug(`  Planned downtime: ${plannedDowntime} minutes`);
            oeeLogger.debug(`  Microstop time: ${microstopTime} minutes`);

            OEEData.datasets[0].data.push(productionTime);
            OEEData.datasets[1].data.push(breakTime);
            OEEData.datasets[2].data.push(unplannedDowntime);
            OEEData.datasets[3].data.push(plannedDowntime);
            OEEData.datasets[4].data.push(microstopTime);

            currentTime = nextTime;
        }

        // 6. Speichere die Daten im Cache und gib sie zurück
        cache[machineId] = OEEData;

        oeeLogger.debug(`Final OEE Data: ${JSON.stringify(OEEData)}`);
        return OEEData;
    } catch (error) {
        errorLogger.error(
            `Error loading or preparing OEE data: ${error.message}`
        );
        throw error;
    }
}

// 7. Hilfsfunktionen zur Berechnung der Downtimes
function calculateDowntimes(
    plannedDowntimes,
    unplannedDowntimes,
    microstops,
    shiftModels,
    currentTime,
    nextTime,
    callback
) {
    let plannedDowntime = 0;
    let unplannedDowntime = 0;
    let microstopTime = 0;
    let breakTime = 0;

    // Berechne geplante Ausfallzeiten
    plannedDowntimes.forEach((downtime) => {
        const downtimeStart = moment(downtime.Start);
        const downtimeEnd = moment(downtime.End);
        if (currentTime.isBefore(downtimeEnd) && nextTime.isAfter(downtimeStart)) {
            plannedDowntime += calculateOverlap(
                currentTime,
                nextTime,
                downtimeStart,
                downtimeEnd
            );
        }
    });

    // Berechne ungeplante Ausfallzeiten
    unplannedDowntimes.forEach((downtime) => {
        const downtimeStart = moment(downtime.Start);
        const downtimeEnd = moment(downtime.End);
        if (currentTime.isBefore(downtimeEnd) && nextTime.isAfter(downtimeStart)) {
            unplannedDowntime += calculateOverlap(
                currentTime,
                nextTime,
                downtimeStart,
                downtimeEnd
            );
        }
    });

    // Berechne Microstops
    microstops.forEach((microstop) => {
        const microstopStart = moment(microstop.Start);
        const microstopEnd = moment(microstop.End);
        if (
            currentTime.isBefore(microstopEnd) &&
            nextTime.isAfter(microstopStart)
        ) {
            microstopTime += calculateOverlap(
                currentTime,
                nextTime,
                microstopStart,
                microstopEnd
            );
        }
    });

    // Berechne Pausen basierend auf dem Schichtmodell
    shiftModels.forEach((shift) => {
        const shiftStartDate = moment(currentTime).format("YYYY-MM-DD");
        const breakStart = moment.utc(
            `${shiftStartDate} ${shift.break_start}`,
            "YYYY-MM-DD HH:mm"
        );
        const breakEnd = moment.utc(
            `${shiftStartDate} ${shift.break_end}`,
            "YYYY-MM-DD HH:mm"
        );

        // Adjust for overnight shifts
        if (breakEnd.isBefore(breakStart)) {
            breakEnd.add(1, "day");
        }

        if (currentTime.isBefore(breakEnd) && nextTime.isAfter(breakStart)) {
            breakTime += calculateOverlap(
                currentTime,
                nextTime,
                breakStart,
                breakEnd
            );
        }
    });

    callback(plannedDowntime, unplannedDowntime, microstopTime, breakTime);
}

// Berechne die Überlappung von Zeitintervallen
function calculateOverlap(startTime, endTime, eventStart, eventEnd) {
    const overlapStart = moment.max(startTime, eventStart);
    const overlapEnd = moment.min(endTime, eventEnd);
    return Math.max(0, overlapEnd.diff(overlapStart, "minutes"));
}

module.exports = {
    loadDataAndPrepareOEE,
};
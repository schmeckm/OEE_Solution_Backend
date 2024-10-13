const axios = require("axios");
const { oeeLogger, errorLogger } = require("../utils/logger");
const config = require("../config/config.json");
const dotenv = require("dotenv");
const moment = require("moment");

dotenv.config();

// Constants
const OEE_API_URL = process.env.OEE_API_URL || config.oeeApiUrl;

// Classification levels for OEE metrics
const CLASSIFICATION_LEVELS = {
    WORLD_CLASS: config.classificationLevels.WORLD_CLASS,
    EXCELLENT: config.classificationLevels.EXCELLENT,
    GOOD: config.classificationLevels.GOOD,
    AVERAGE: config.classificationLevels.AVERAGE,
};

// =====================
// Fetch OEE Data from API
// =====================
async function fetchOEEDataFromAPI(machineId) {
    try {
        const response = await axios.get(`${OEE_API_URL}/prepareOEE/oee/${machineId}`);
        return response.data;
    } catch (error) {
        errorLogger.error(`Failed to fetch OEE data from API for machineId ${machineId}: ${error.message}`);
        throw new Error("Could not fetch OEE data from API");
    }
}

// =====================
// OEE Calculator Class
// =====================
class OEECalculator {
    constructor() {
        this.oeeData = {};
    }

    // Reset OEE Data structure for initialization
    resetOEEData() {
        return {
            ProcessOrderNumber: null,
            MaterialNumber: null,
            MaterialDescription: null,
            PlannedProductionQuantity: 0,
            Runtime: 0,
            ActualPerformance: 0,
            TargetPerformance: 0,
            ActualProductionYield: 0,
            ActualProductionQuantity: 0,
            UnplannedDowntime: 0,
            setupTime: 0,
            processingTime: 0,
            teardownTime: 0,
            availability: 0,
            performance: 0,
            quality: 0,
            oee: 0,
            StartTime: null,
            EndTime: null,
            plannedTakt: 0,
            actualTakt: 0,
            expectedEndTime: null,
        };
    }

    // Initialize OEE Data for a machine by fetching it from the API
    async init(machineId) {
        try {
            oeeLogger.info(`Initializing OEECalculator for machineId ${machineId}`);
            const OEEData = await fetchOEEDataFromAPI(machineId);
            oeeLogger.debug(`Fetched OEEData for machineId ${machineId}:`, OEEData); // Protokolliere die erhaltenen Daten
            if (OEEData) {
                this.setOEEData(OEEData, machineId);
            } else {
                oeeLogger.warn(`No OEE data found for machineId ${machineId}`);
            }
        } catch (error) {
            errorLogger.error(`Error initializing OEECalculator for machineId ${machineId}: ${error.message}`);
            throw error;
        }
    }

    // Set the OEE Data for a specific machine
    setOEEData(OEEData, machineId) {
        const processOrder = OEEData.processOrder;

        if (!processOrder || !processOrder.Start || !processOrder.End) {
            throw new Error("Required time fields (Start/End) are missing in the data");
        }

        oeeLogger.debug(`Setting OEE data for machineId ${machineId}:`, processOrder);

        const plannedStart = moment(processOrder.Start);
        const plannedEnd = moment(processOrder.End);

        if (!plannedStart.isValid() || !plannedEnd.isValid()) {
            throw new Error("Invalid Start or End date in process order");
        }

        let plannedTakt, actualTakt, remainingTime, expectedEndTime;

        //Process Order not started and not finally confirmed 
        if (!processOrder.ActualProcessOrderStart && !processOrder.ActualProcessOrderEnd) {
            const plannedDurationMinutes = plannedEnd.diff(plannedStart, "minutes");
            plannedTakt = plannedDurationMinutes / processOrder.PlannedProductionQuantity;
            actualTakt = plannedTakt;
            remainingTime = processOrder.PlannedProductionQuantity * actualTakt;
            expectedEndTime = plannedStart.add(remainingTime, "minutes");

            //Process Order started but not finally confirmed 
        } else if (processOrder.ActualProcessOrderStart && !processOrder.ActualProcessOrderEnd) {
            const actualStart = moment(processOrder.ActualProcessOrderStart);
            const plannedDurationMinutes = plannedEnd.diff(actualStart, "minutes");
            plannedTakt = plannedDurationMinutes / processOrder.PlannedProductionQuantity;
            actualTakt = plannedTakt;

            //Das kann hier noch nicht berechnet werden da hier die Formel lautet: Der Wert liegt aber hier noch nicht vor
            //RemainingTime = (processOrder.PlannedProductionQuantity - ActualProductionQuantity) * actualTakt;           
            remainingTime = (processOrder.PlannedProductionQuantity - processOrder.ActualProductionQuantity) * actualTakt;
            expectedEndTime = plannedEnd;

            //Process Order fully completed on the line
        } else if (processOrder.ActualProcessOrderStart && processOrder.ActualProcessOrderEnd) {
            const actualStart = moment(processOrder.ActualProcessOrderStart);
            const actualEnd = moment(processOrder.ActualProcessOrderEnd);
            const actualDurationMinutes = actualEnd.diff(actualStart, "minutes");
            plannedTakt = plannedEnd.diff(plannedStart, "minutes") / processOrder.PlannedProductionQuantity;
            actualTakt = actualDurationMinutes / processOrder.PlannedProductionQuantity;

            //Das kann hier noch nicht berechnet werden da hier die Formel lautet: Der Wert liegt aber hier noch nicht vor
            //RemainingTime = (processOrder.PlannedProductionQuantity - ActualProductionQuantity) * actualTakt; 
            remainingTime = (processOrder.PlannedProductionQuantity - processOrder.ActualProductionQuantity) * actualTakt;
            expectedEndTime = actualEnd.add(remainingTime, "minutes");
        }

        this.oeeData[machineId] = {
            ...this.resetOEEData(),
            ...processOrder,
            StartTime: processOrder.ActualProcessOrderStart || processOrder.Start,
            EndTime: processOrder.ActualProcessOrderEnd || processOrder.End,
            Runtime: processOrder.setupTime + processOrder.processingTime + processOrder.teardownTime,
            plannedTakt,
            actualTakt,
            remainingTime,
            expectedEndTime: expectedEndTime ? expectedEndTime.format("YYYY-MM-DDTHH:mm:ss.SSSZ") : null,
        };

        console.log(this.oeeData[machineId])

    }

    //This value are coming from OEEProcessor 
    async calculateMetrics(machineId, totalUnplannedDowntime, totalPlannedDowntime, ActualProductionQuantity, ActualProductionYield, processOrder) {
        try {
            if (!this.oeeData[machineId]) {
                throw new Error(`No data found for machineId: ${machineId}`);
            }

            oeeLogger.debug(`Calculating metrics for machineId ${machineId}`);

            const {
                ActualProcessOrderStart,
                ActualProcessOrderEnd,
                PlannedProductionQuantity,
                Start,
                End,
                setupTime,
                processingTime,
                teardownTime,
            } = processOrder;

            if (!ActualProcessOrderStart && !Start) {
                throw new Error("At least ActualProcessOrderStart or Start is required");
            }

            // Validierung der Eingaben
            if (typeof totalUnplannedDowntime !== 'number' || typeof ActualProductionQuantity !== 'number' || typeof ActualProductionYield !== 'number') {
                throw new Error("totalUnplannedDowntime, ProductionQuantity and ActualProductionYield must be numbers");
            }

            const plannedStart = moment(Start);
            const plannedEnd = moment(End);
            const actualStart = moment(ActualProcessOrderStart || Start);
            const actualEnd = ActualProcessOrderEnd ? moment(ActualProcessOrderEnd) : null;

            if (!plannedStart.isValid() || !plannedEnd.isValid() || !actualStart.isValid() || (actualEnd && !actualEnd.isValid())) {
                throw new Error("Invalid date provided in the input");
            }

            const plannedDurationMinutes = plannedEnd.diff(plannedStart, "minutes");
            let plannedTakt, actualTakt, remainingTime, expectedEndTime;

            //Machine has completed the process Order - WIP
            if (actualEnd) {
                const actualDurationMinutes = actualEnd.diff(actualStart, "minutes");
                plannedTakt = plannedDurationMinutes / PlannedProductionQuantity;
                actualTakt = ActualProductionQuantity > 0 ? plannedDurationMinutes / ActualProductionQuantity : null;
                remainingTime = (PlannedProductionQuantity - ActualProductionQuantity) * actualTakt;
                expectedEndTime = actualEnd.add(remainingTime, "minutes");
            } else {

                //Machine is still producting - Order not completed yet
                plannedTakt = plannedDurationMinutes / PlannedProductionQuantity;
                actualTakt = ActualProductionQuantity > 0 ? plannedDurationMinutes / ActualProductionQuantity : null;
                remainingTime = (PlannedProductionQuantity - ActualProductionQuantity) * (actualTakt || plannedTakt);
                expectedEndTime = actualStart.add(remainingTime, "minutes");
            }

            const scrap = ActualProductionQuantity - ActualProductionYield;

            this.oeeData[machineId] = {
                ...this.oeeData[machineId],
                ...processOrder,
                StartTime: processOrder.ActualProcessOrderStart || processOrder.Start,
                EndTime: processOrder.ActualProcessOrderEnd || processOrder.End,
                Runtime: setupTime + processingTime + teardownTime,
                ActualProductionQuantity,
                totalUnplannedDowntime,
                ActualProductionYield,
                plannedDurationMinutes,
                plannedTakt,
                actualTakt,
                remainingTime,
                expectedEndTime: expectedEndTime ? expectedEndTime.format("YYYY-MM-DDTHH:mm:ss.SSSZ") : null,
                scrap,
            };

            const availability = this.oeeData[machineId].Runtime > 0 ?
                ((this.oeeData[machineId].Runtime - totalUnplannedDowntime) / this.oeeData[machineId].Runtime) * 100 :
                0;

            const performance = actualTakt ? (plannedTakt / actualTakt) * 100 : 0;

            const quality = ActualProductionQuantity > 0 ?
                (ActualProductionYield / ActualProductionQuantity) * 100 :
                0;

            const oee = (availability * performance * quality) / 10000;

            this.oeeData[machineId] = {
                ...this.oeeData[machineId],
                availability,
                performance,
                quality,
                oee,
                actualDurationMinutes: actualEnd ? actualEnd.diff(actualStart, "minutes") : null,
                setupTime,
                teardownTime,
            };

            const classification = this.classifyOEE(machineId);

            this.oeeData[machineId].classification = classification;
        } catch (error) {
            oeeLogger.error(`Error calculating metrics for machineId ${machineId}: ${error.message}`);
        }
    }

    // Classify OEE based on predefined levels
    classifyOEE(machineId) {
        const oee = (this.oeeData[machineId] && this.oeeData[machineId].oee) || undefined;

        if (oee === undefined) {
            throw new Error(`OEE not calculated for machineId: ${machineId}`);
        }

        if (oee >= CLASSIFICATION_LEVELS.WORLD_CLASS) return "World-Class";
        if (oee >= CLASSIFICATION_LEVELS.EXCELLENT) return "Excellent";
        if (oee >= CLASSIFICATION_LEVELS.GOOD) return "Good";
        if (oee >= CLASSIFICATION_LEVELS.AVERAGE) return "Average";
        return "Below Average";
    }

    // Retrieve calculated metrics for a machine
    getMetrics(machineId) {
        if (!this.oeeData[machineId]) {
            throw new Error(`No metrics available for machineId: ${machineId}`);
        }
        return this.oeeData[machineId];
    }
}

module.exports = OEECalculator;
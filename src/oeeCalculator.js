const axios = require("axios");
const { oeeLogger, errorLogger } = require("../utils/logger");
const { fetchOEEDataFromAPI } = require("./dataLoader");
const config = require("../config/config.json");
const dotenv = require("dotenv");
const moment = require("moment");

dotenv.config();

// Constants
const OEE_API_URL = process.env.OEE_API_URL || config.oeeApiUrl;
const DATE_FORMAT = process.env.DATE_FORMAT;

// Creating an axios instance with base URL and default headers
const apiClient = axios.create({
    baseURL: OEE_API_URL,
    headers: {
        'x-api-key': process.env.API_KEY, // API key from environment variables
    },
});

// Classification levels for OEE metrics
const CLASSIFICATION_LEVELS = {
    WORLD_CLASS: config.classificationLevels.WORLD_CLASS,
    EXCELLENT: config.classificationLevels.EXCELLENT,
    GOOD: config.classificationLevels.GOOD,
    AVERAGE: config.classificationLevels.AVERAGE,
};

// OEE Calculator Class
class OEECalculator {
    constructor() {
        this.oeeData = {};
    }

    // Initialize the OEE Calculator with machine-specific data
    async init(machineId) {
        try {
            // Fetch OEE data from API
            const OEEData = await fetchOEEDataFromAPI(machineId);
            if (OEEData) {
                this.setOEEData(OEEData, machineId);
                return true; // Ensure that a result is returned
            } else {
                errorLogger.warn(`No OEE data found for machineId ${machineId}`);
                return false;
            }
        } catch (error) {
            errorLogger.error(`Error initializing OEE calculator for machineId ${machineId}: ${error.message}`);
            throw error;
        }
    }

    // Set the OEE Data for a specific machine
    setOEEData(OEEData, machineId) {
        const processOrder = OEEData.processOrder;

        if (!processOrder?.start_date || !processOrder?.end_date) {
            throw new Error("Required time fields (start_date/end_date) are missing in the data");
        }

        const plannedStart = moment.utc(processOrder.start_date);
        const plannedEnd = moment.utc(processOrder.end_date);

        if (!plannedStart.isValid() || !plannedEnd.isValid()) {
            throw new Error("Invalid start_date or end_date in process order");
        }

        let plannedTakt, actualTakt, remainingTime, expectedEndTime;
        let actualEnd = null; // Initialize actualEnd to null

        if (!processOrder.actualprocessorderstart && !processOrder.actualprocessorderend) {
            const plannedDurationMinutes = plannedEnd.diff(plannedStart, "minutes");
            plannedTakt = plannedDurationMinutes / processOrder.plannedproductionquantity;
            actualTakt = plannedTakt;
            remainingTime = processOrder.plannedproductionquantity * actualTakt;
            expectedEndTime = plannedStart.add(remainingTime, "minutes");

        } else if (processOrder.actualprocessorderstart && !processOrder.actualprocessorderend) {
            const actualStart = moment.utc(processOrder.actualprocessorderstart);
            const plannedDurationMinutes = plannedEnd.diff(actualStart, "minutes");
            plannedTakt = plannedDurationMinutes / processOrder.plannedproductionquantity;
            actualTakt = plannedTakt;
            remainingTime = (processOrder.plannedproductionquantity - processOrder.confirmedproductionquantity) * actualTakt;
            expectedEndTime = plannedEnd;

        } else if (processOrder.actualprocessorderstart && processOrder.actualprocessorderend) {
            const actualStart = moment.utc(processOrder.actualprocessorderstart);
            actualEnd = moment.utc(processOrder.actualprocessorderend); // Define actualEnd here
            const actualDurationMinutes = actualEnd.diff(actualStart, "minutes");
            plannedTakt = plannedEnd.diff(plannedStart, "minutes") / processOrder.plannedproductionquantity;
            actualTakt = actualDurationMinutes / processOrder.plannedproductionquantity;
            remainingTime = (processOrder.plannedproductionquantity - processOrder.confirmedproductionquantity) * actualTakt;
            expectedEndTime = actualEnd.add(remainingTime, "minutes");
        }

        this.oeeData[machineId] = {
            // Basic Information
            order_id: processOrder.order_id,
            processordernumber: processOrder.processordernumber,
            materialnumber: processOrder.materialnumber,
            materialdescription: processOrder.materialdescription,
            start_date: processOrder.start_date,
            end_date: processOrder.end_date,
            workcenter_id: processOrder.workcenter_id,
            processorderstatus: processOrder.processorderstatus,
            plant: OEEData.plant,
            area: OEEData.area,
            lineId: OEEData.lineId,

            // Time Information
            setuptime: processOrder.setuptime,
            processingtime: processOrder.processingtime,
            teardowntime: processOrder.teardowntime,
            Runtime: processOrder.setuptime + processOrder.processingtime + processOrder.teardowntime,
            plannedDurationMinutes: plannedEnd.diff(plannedStart, "minutes"),
            actualDurationMinutes: actualEnd ? actualEnd.diff(actualStart, "minutes") : null,

            // Production Information
            plannedproductionquantity: processOrder.plannedproductionquantity,
            confirmedproductionyield: processOrder.confirmedproductionyield,
            confirmedproductionquantity: processOrder.confirmedproductionquantity,
            ActualProductionQuantity: null,
            ActualProductionYield: null,
            scrap: null,

            // Performance Metrics
            plannedTakt,
            actualTakt,
            remainingTime,
            expectedEndTime: expectedEndTime ? expectedEndTime.format(DATE_FORMAT) : null,
            availability: null,
            performance: null,
            quality: null,
            oee: null,
            classification: null,
        };
    }

    // Calculate OEE metrics
    async calculateMetrics(machineId, totalUnplannedDowntime, totalPlannedDowntime, ActualProductionQuantity, ActualProductionYield, processOrder) {
        try {
            if (!this.oeeData[machineId]) {
                throw new Error(`No data found for machineId: ${machineId}`);
            }

            // oeeLogger.debug(`Calculating metrics for machineId ${machineId}`);

            const {
                actualprocessorderstart,
                actualprocessorderend,
                plannedproductionquantity,
                start_date,
                end_date,
                setuptime,
                processingtime,
                teardowntime,
            } = processOrder;

            if (!actualprocessorderstart && !start_date) {
                throw new Error("At least actualprocessorderstart or start_date is required");
            }

            const plannedStart = moment.utc(start_date);
            const plannedEnd = moment.utc(end_date);
            const actualStart = moment.utc(actualprocessorderstart || start_date);
            const actualEnd = actualprocessorderend ? moment.utc(actualprocessorderend) : null;

            const plannedDurationMinutes = plannedEnd.diff(plannedStart, "minutes");
            let plannedTakt, actualTakt, remainingTime, expectedEndTime;

            if (actualEnd) {
                const actualDurationMinutes = actualEnd.diff(actualStart, "minutes");
                plannedTakt = plannedDurationMinutes / plannedproductionquantity;
                actualTakt = ActualProductionQuantity > 0 ? plannedDurationMinutes / ActualProductionQuantity : null;
                remainingTime = (plannedproductionquantity - ActualProductionQuantity) * actualTakt;
                expectedEndTime = actualEnd.add(remainingTime, "minutes");
            } else {
                plannedTakt = plannedDurationMinutes / plannedproductionquantity;
                actualTakt = ActualProductionQuantity > 0 ? plannedDurationMinutes / ActualProductionQuantity : null;
                remainingTime = (plannedproductionquantity - ActualProductionQuantity) * (actualTakt || plannedTakt);
                expectedEndTime = actualStart.add(remainingTime, "minutes");
            }

            const scrap = ActualProductionQuantity - ActualProductionYield;

            this.oeeData[machineId] = {
                ...this.oeeData[machineId],
                ActualProductionQuantity,
                ActualProductionYield,
                totalUnplannedDowntime,
                scrap,

                // Performance Metrics
                plannedTakt,
                actualTakt,
                remainingTime,
                expectedEndTime: expectedEndTime ? expectedEndTime.format(DATE_FORMAT) : null,

                // OEE Metrics
                availability: this.oeeData[machineId].Runtime > 0 ?
                    ((this.oeeData[machineId].Runtime - totalUnplannedDowntime) / this.oeeData[machineId].Runtime) * 100 :
                    0,
                performance: actualTakt ? (plannedTakt / actualTakt) * 100 : 0,
                quality: ActualProductionQuantity > 0 ?
                    (ActualProductionYield / ActualProductionQuantity) * 100 :
                    0,
                oee: (this.oeeData[machineId].availability * this.oeeData[machineId].performance * this.oeeData[machineId].quality) / 10000,
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
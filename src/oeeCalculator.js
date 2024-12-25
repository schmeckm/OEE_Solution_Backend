const { fetchOEEDataFromAPI } = require("./dataLoader");
const config = require("../config/config.json");
const {
    axios,
    dotenv,
    oeeLogger,
    errorLogger,
    moment,
    OEE_API_URL,
    DATE_FORMAT,
    apiClient
} = require("./header");

const CALCULATION_MODE = config.calculationMode || "standard"; 

// Classification levels for OEE metrics
const CLASSIFICATION_LEVELS = {
    WORLD_CLASS: config.classificationLevels.WORLD_CLASS,
    EXCELLENT: config.classificationLevels.EXCELLENT,
    GOOD: config.classificationLevels.GOOD,
    AVERAGE: config.classificationLevels.AVERAGE,
};

// OEE Calculator Class
/**
 * Class representing an OEE (Overall Equipment Effectiveness) Calculator.
 */
class OEECalculator {
    /**
     * Create an OEECalculator.
     */
    constructor() {
        this.oeeData = {};
    }

    /**
     * Initialize the OEE Calculator with machine-specific data.
     * @param {string} machineId - The ID of the machine.
     * @returns {Promise<boolean>} - Returns true if initialization is successful, otherwise false.
     * @throws {Error} - Throws an error if initialization fails.
     */
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

    /**
     * Sets the OEE (Overall Equipment Effectiveness) data for a specific machine.
     *
     * @param {Object} OEEData - The data object containing process order and other relevant information.
     * @param {string} machineId - The unique identifier for the machine.
     * @throws {Error} Throws an error if required time fields (start_date/end_date) are missing or invalid.
     *
     * The function calculates various metrics related to the process order, including:
     * - Planned and actual takt times
     * - Remaining time for production
     * - Expected end time of the process order
     * 
     * The calculated metrics and other relevant information are stored in the `oeeData` object for the specified machine.
     *
     * The function handles three scenarios based on the presence of actual process order start and end times:
     * 1. No actual start and end times: Uses planned start and end times to calculate metrics.
     * 2. Actual start time but no end time: Uses actual start time and planned end time to calculate metrics.
     * 3. Both actual start and end times: Uses actual start and end times to calculate metrics.
     *
     * The stored data includes:
     * - Basic information (order ID, process order number, material details, etc.)
     * - Time information (setup time, processing time, teardown time, runtime, planned and actual duration)
     * - Production information (planned and confirmed production quantities and yields, scrap)
     * - Performance metrics (planned and actual takt times, remaining time, expected end time, availability, performance, quality, OEE, classification)
     */
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

        let plannedTakt, actualTakt, remainingTime, expectedEndTime, runtime;
        let actualEnd = null; // Initialize actualEnd to null

        // 1. No actual start and end times: Uses planned start and end times to calculate metrics.
        if (!processOrder.actualprocessorderstart && !processOrder.actualprocessorderend) {
            oeeLogger.info('1. No actual start and end times: Uses planned start and end times to calculate metrics.');
            const plannedDurationMinutes = plannedEnd.diff(plannedStart, "minutes");
            plannedTakt = plannedDurationMinutes / processOrder.plannedproductionquantity;
            actualTakt = plannedTakt;
            remainingTime = processOrder.plannedproductionquantity * actualTakt;
            expectedEndTime = plannedStart.add(remainingTime, "minutes");
            runtime = plannedDurationMinutes; // Runtime is the planned duration in this case
            oeeLogger.info('Runtime', runtime);

        // 2. Actual start time but no end time: Uses actual start time and planned end time to calculate metrics.
        } else if (processOrder.actualprocessorderstart && !processOrder.actualprocessorderend) {
            oeeLogger.info('2. Actual start time but no end time: Uses actual start time and planned end time to calculate metrics.');
            const actualStart = moment.utc(processOrder.actualprocessorderstart);
            const plannedDurationMinutes = plannedEnd.diff(actualStart, "minutes");
            plannedTakt = plannedDurationMinutes / processOrder.plannedproductionquantity;
            actualTakt = plannedTakt;
            remainingTime = (processOrder.plannedproductionquantity - processOrder.confirmedproductionquantity) * actualTakt;
            expectedEndTime = plannedEnd;
            runtime = moment().diff(actualStart, "minutes"); // Runtime is the time from actual start to now
            oeeLogger.info('Runtime', runtime);

        // 3. Both actual start and end times: Uses actual start and end times to calculate metrics.
        } else if (processOrder.actualprocessorderstart && processOrder.actualprocessorderend) {
            oeeLogger.info('3. Both actual start and end times: Uses actual start and end times to calculate metrics.');
            const actualStart = moment.utc(processOrder.actualprocessorderstart);
            actualEnd = moment.utc(processOrder.actualprocessorderend); // Define actualEnd here
            const actualDurationMinutes = actualEnd.diff(actualStart, "minutes");
            plannedTakt = plannedEnd.diff(plannedStart, "minutes") / processOrder.plannedproductionquantity;
            actualTakt = actualDurationMinutes / processOrder.plannedproductionquantity;
            remainingTime = (processOrder.plannedproductionquantity - processOrder.confirmedproductionquantity) * actualTakt;
            expectedEndTime = actualEnd.add(remainingTime, "minutes");
            runtime = actualDurationMinutes; // Runtime is the actual duration in this case
            oeeLogger.info('Runtime', runtime);
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
            plannedRuntime: processOrder.setuptime + processOrder.processingtime + processOrder.teardowntime,
            actualRuntime: runtime,
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

    /**
     * Calculate OEE metrics.
     * @param {string} machineId - The ID of the machine.
     * @param {number} totalUnplannedDowntime - Total unplanned downtime in minutes.
     * @param {number} totalPlannedDowntime - Total planned downtime in minutes.
     * @param {number} ActualProductionQuantity - Actual production quantity.
     * @param {number} ActualProductionYield - Actual production yield.
     * @param {Object} processOrder - The process order object.
     * @throws {Error} - Throws an error if no data is found for the machine or required fields are missing.
     */
    async calculateMetrics(machineId, totalUnplannedDowntime, totalPlannedDowntime, ActualProductionQuantity, ActualProductionYield, processOrder) {
        try {
            if (!this.oeeData[machineId]) {
                throw new Error(`No data found for machineId: ${machineId}`);
            }

            oeeLogger.debug(`Calculating metrics for machineId ${machineId}`);

            const {
                actualprocessorderstart,
                actualprocessorderend,
                plannedproductionquantity,
                start_date,
                end_date,
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
                availability: this.oeeData[machineId].actualRuntime > 0 ?
                    ((this.oeeData[machineId].actualRuntime - totalUnplannedDowntime) / this.oeeData[machineId].actualRuntime) * 100 :
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

    /**
     * Classify OEE based on predefined levels.
     * @param {string} machineId - The ID of the machine.
     * @returns {string} - The classification of the OEE.
     * @throws {Error} - Throws an error if OEE is not calculated for the machine.
     */
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

    /**
     * Retrieve calculated metrics for a machine.
     * @param {string} machineId - The ID of the machine.
     * @returns {Object} - The calculated metrics for the machine.
     * @throws {Error} - Throws an error if no metrics are available for the machine.
     */
    getMetrics(machineId) {
        if (!this.oeeData[machineId]) {
            throw new Error(`No metrics available for machineId: ${machineId}`);
        }
        return this.oeeData[machineId];
    }
}

module.exports = OEECalculator;
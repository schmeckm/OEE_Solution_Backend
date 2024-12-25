const {
    axios,
    moment,
    dotenv,
    oeeLogger,
    errorLogger,
    defaultLogger,
    OEE_API_URL,
    DATE_FORMAT,
    TIMEZONE,
    apiClient
} = require("../src/header"); // Stellen Sie sicher, dass der Pfad korrekt ist

/**
 * Aggregates microstop data by process order, filtered by ProcessOrderNumber or date range.
 * 
 * @param {string|null} processOrderNumber - The ProcessOrderNumber to filter by, or null to ignore.
 * @param {Date|null} startDate - The start date for filtering, or null to ignore start date.
 * @param {Date|null} endDate - The end date for filtering, or null to ignore end date.
 * @returns {Object} An object where the keys are reasons and the values are the aggregated differenz values, sorted by differenz in descending order.
 */
const aggregateMicrostopsByProcessOrder = async (processOrderNumber) => {
    const fetchMicrostops = async () => {
        try {
            const response = await apiClient.get('/microstops');
            return response.data;
        } catch (err) {
            errorLogger.error('Failed to fetch microstops from API', { error: err.message });
            throw err;
        }
    };

    const fetchProcessOrder = async (processOrderNumber) => {
        try {
            const response = await apiClient.get(`/processorders/${processOrderNumber}`);
            return response.data;
        } catch (err) {
            errorLogger.error(`Failed to fetch process order with number ${processOrderNumber} from API`, { error: err.message });
            throw err;
        }
    };

    const microstops = await fetchMicrostops();
    const relevantProcessOrder = await fetchProcessOrder(processOrderNumber);
    oeeLogger.info('Fetched microstops and process order from API', { microstops, relevantProcessOrder });

    if (!relevantProcessOrder) {
        throw new Error(`Process order with number ${processOrderNumber} not found`);
    }

    // Filter microstops for the relevant process order
    const relevantMicrostops = microstops.filter(microstop => microstop.order_id === relevantProcessOrder.order_id);
    oeeLogger.info(`Found ${relevantMicrostops.length} microstops for process order ${processOrderNumber}`);

    if (relevantMicrostops.length === 0) {
        return { message: "No microstops found" };
    }

    // Aggregate and sort the microstops by reason and differenz
    const orderAggregatedData = {};

    relevantMicrostops.forEach(microstop => {
        orderAggregatedData[microstop.reason] = (orderAggregatedData[microstop.reason] || 0) + microstop.differenz;
    });

    const sortedAggregatedData = Object.entries(orderAggregatedData)
        .sort(([, a], [, b]) => b - a)
        .map(([key, value]) => ({ reason: key, total: value }));

    const aggregatedData = {
        processOrderNumber: processOrderNumber,
        materialNumber: relevantProcessOrder.materialnumber,
        sapprocessordernumber: relevantProcessOrder.processordernumber,
        materialDescription: relevantProcessOrder.materialdescription,
        startDate: relevantProcessOrder.start_date,
        endDate: relevantProcessOrder.end_date,
        microstops: sortedAggregatedData
    };

    oeeLogger.info('Aggregated microstops data', { aggregatedData });

    return aggregatedData;
};

module.exports = { aggregateMicrostopsByProcessOrder };
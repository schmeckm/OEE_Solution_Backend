const {
    axios,
    moment,
    dotenv,
    oeeLogger,
    errorLogger,
    apiClient
} = require("../src/header");

/**
 * Aggregates microstop data by process order, filtered by ProcessOrderNumber.
 *
 * @param {string} processOrderNumber - The process order number to filter by.
 * @returns {Object} Aggregated microstop data for the process order.
 */
const aggregateMicrostopsByProcessOrder = async (processOrderNumber) => {
    // Fetch all microstops
    const fetchMicrostops = async () => {
        try {
            const response = await apiClient.get("/microstops");
            return response.data;
        } catch (err) {
            errorLogger.error("Failed to fetch microstops from API", { error: err.message });
            throw new Error("Error fetching microstops data.");
        }
    };

    // Fetch specific process order
    const fetchProcessOrder = async (processOrderNumber) => {
            try {
                const response = await apiClient.get(`/processorders/${processOrderNumber}`);
                oeeLogger.info(`Fetched process order ${processOrderNumber}`);
                return response.data;
            } catch (err) {
                errorLogger.error(`Failed to fetch process order ${processOrderNumber}`, { error: err.message });
                throw new Error("Error fetching process order data.");
            }
        };
    
    const microstops = await fetchMicrostops();
    const processOrder = await fetchProcessOrder(processOrderNumber);
    
    // Ensure process order exists
    if (!processOrder) {
        throw new Error(`Process order ${processOrderNumber} not found.`);
    }

    // Filter microstops for the specific process order
    const relevantMicrostops = microstops.filter(
        (microstop) => microstop.order_id === processOrder.order_id
    );

    // If no microstops found, return a message
    if (relevantMicrostops.length === 0) {
        return { message: "No microstops found for the given process order." };
    }

    // Aggregate microstops by reason and calculate total differenz
    const aggregatedData = {};
    relevantMicrostops.forEach((microstop) => {
        aggregatedData[microstop.reason] = (aggregatedData[microstop.reason] || 0) + microstop.differenz;
    });

    // Sort aggregated data by total differenz in descending order
    const sortedAggregatedData = Object.entries(aggregatedData)
        .sort(([, a], [, b]) => b - a)
        .map(([reason, total]) => ({ reason, total }));

    // Return aggregated data with process order details
    return {
        processOrderNumber: processOrderNumber,
        materialNumber: processOrder.materialnumber,
        sapProcessOrderNumber: processOrder.processordernumber,
        materialDescription: processOrder.materialdescription,
        startDate: processOrder.start_date,
        endDate: processOrder.end_date,
        microstops: sortedAggregatedData,
    };
};

module.exports = { aggregateMicrostopsByProcessOrder };

  
// microstopsService.js
const path = require('path');
const moment = require('moment');
const fs = require('fs').promises;
const { defaultLogger, errorLogger } = require('../utils/logger');

// Helper function to load JSON data from a file
const loadJsonFile = async(filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        errorLogger.error(`Failed to load JSON file: ${filePath}`, { error: err.message });
        throw err;
    }
};

/**
 * Aggregates microstop data by process order, filtered by ProcessOrderNumber or date range.
 * 
 * @param {string|null} processOrderNumber - The ProcessOrderNumber to filter by, or null to ignore.
 * @param {Date|null} startDate - The start date for filtering, or null to ignore start date.
 * @param {Date|null} endDate - The end date for filtering, or null to ignore end date.
 * @returns {Object} An object where the keys are reasons and the values are the aggregated differenz values, sorted by differenz in descending order.
 */
const aggregateMicrostopsByProcessOrder = async(processOrderNumber = null, startDate = null, endDate = null) => {
    const microstopsFilePath = path.resolve(__dirname, '../data/microstops.json');
    const processOrdersFilePath = path.resolve(__dirname, '../data/processOrder.json');

    const microstops = await loadJsonFile(microstopsFilePath);
    const processOrders = await loadJsonFile(processOrdersFilePath);

    let relevantProcessOrders = processOrders;

    if (processOrderNumber) {
        relevantProcessOrders = relevantProcessOrders.filter(order => order.ProcessOrderNumber === processOrderNumber);
    } else if (startDate || endDate) {
        relevantProcessOrders = relevantProcessOrders.filter(order => {
            const orderStartDate = moment(order.Start);
            const orderEndDate = moment(order.End);
            if (startDate && orderEndDate.isBefore(startDate)) {
                return false;
            }
            if (endDate && orderStartDate.isAfter(endDate)) {
                return false;
            }
            return true;
        });
    }

    const aggregatedData = {};

    relevantProcessOrders.forEach(order => {
        const orderStartDate = moment(order.Start);
        const orderEndDate = moment(order.End);

        const relevantMicrostops = microstops.filter(microstop => {
            const microstopStartDate = moment(microstop.Start);
            const microstopEndDate = moment(microstop.End);

            return microstop.machine_id === order.machine_id &&
                microstopStartDate.isSameOrAfter(orderStartDate) &&
                microstopEndDate.isSameOrBefore(orderEndDate);
        });

        if (relevantMicrostops.length > 0) { // Only include process orders with microstops
            const orderAggregatedData = {};

            relevantMicrostops.forEach(microstop => {
                if (!orderAggregatedData[microstop.Reason]) {
                    orderAggregatedData[microstop.Reason] = 0;
                }
                orderAggregatedData[microstop.Reason] += microstop.Differenz;
            });

            const sortedAggregatedData = Object.entries(orderAggregatedData)
                .sort(([, a], [, b]) => b - a)
                .map(([key, value]) => ({ reason: key, total: value }));

            aggregatedData[order.ProcessOrderNumber] = {
                microstops: sortedAggregatedData
            };
        }
    });

    return aggregatedData;
};


module.exports = { aggregateMicrostopsByProcessOrder };
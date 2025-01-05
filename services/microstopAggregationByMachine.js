const { axios, moment, oeeLogger, errorLogger, apiClient } = require("../src/header");

/**
 * Aggregates microstop data by machine, filtered by machine ID and optional date range.
 * If no machine ID is given, aggregates all microstop data.
 *
 * @param {string|null} machineId - The machine ID to filter by, or null to aggregate all.
 * @param {Date|null} startDate - The start date for filtering, or null to ignore.
 * @param {Date|null} endDate - The end date for filtering, or null to ignore.
 * @returns {Object} Aggregated data for the given filters.
 */
const aggregateMicrostopsByMachine = async (machineId = null, startDate = null, endDate = null) => {
  const fetchMicrostops = async () => {
    try {
      const response = await apiClient.get('/microstops');
      return response.data;
    } catch (err) {
      errorLogger.error('Failed to fetch microstops from API', { error: err.message });
      throw err;
    }
  };

  const microstops = await fetchMicrostops();

  if (!machineId) {
    oeeLogger.info('No machine ID provided. Returning all microstops.');
    return {
      machineId: null,
      microstops: microstops.map(microstop => ({
        reason: microstop.reason,
        total: microstop.differenz,
      })),
    };
  }

  const relevantMicrostops = microstops.filter(microstop => {
    const msDate = moment(microstop.start_date);
    return (
      (!machineId || microstop.workcenter_id === machineId) &&
      (!startDate || !msDate.isBefore(moment(startDate))) &&
      (!endDate || !msDate.isAfter(moment(endDate)))
    );
  });

  if (relevantMicrostops.length === 0) {
    return { machineId, message: "No microstops found for the given machine and filters." };
  }

  const machineAggregatedData = {};

  relevantMicrostops.forEach(microstop => {
    machineAggregatedData[microstop.reason] =
      (machineAggregatedData[microstop.reason] || 0) + microstop.differenz;
  });

  const sortedAggregatedData = Object.entries(machineAggregatedData)
    .sort(([, a], [, b]) => b - a)
    .map(([key, value]) => ({ reason: key, total: value }));

  return {
    machineId,
    microstops: sortedAggregatedData,
  };
};

module.exports = { aggregateMicrostopsByMachine };
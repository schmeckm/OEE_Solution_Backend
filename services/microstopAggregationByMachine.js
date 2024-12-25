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
* Aggregates microstop data by machine, filtered by machine ID and optional date range.
* If no machine ID or date range is given, aggregates all microstop data.
* 
* @param {string|null} machineId - The machine ID to filter by, or null to ignore.
* @param {Date|null} startDate - The start date for filtering, or null to ignore start date.
* @param {Date|null} endDate - The end date for filtering, or null to ignore end date.
* @returns {Object} An object where the keys are reasons and the values are the aggregated differenz values, sorted by differenz in descending order.
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
  oeeLogger.info('Fetched microstops from API', { microstops });

  // Filter microstops for the relevant machine
  const relevantMicrostops = microstops.filter(microstop => {
      const msDate = moment(microstop.start_date);
      return !(machineId && microstop.workcenter_id !== machineId) &&
             !(startDate && msDate.isBefore(moment(startDate))) &&
             !(endDate && msDate.isAfter(moment(endDate)));
  });
  oeeLogger.info(`Found ${relevantMicrostops.length} microstops for machine ${machineId}`);

  if (relevantMicrostops.length === 0) {
      return { message: "No microstops found" };
  }

  // Aggregate and sort the microstops by reason and differenz
  const machineAggregatedData = {};

  relevantMicrostops.forEach(microstop => {
      machineAggregatedData[microstop.reason] = (machineAggregatedData[microstop.reason] || 0) + microstop.differenz;
  });

  const sortedAggregatedData = Object.entries(machineAggregatedData)
      .sort(([, a], [, b]) => b - a)
      .map(([key, value]) => ({ reason: key, total: value }));

  const aggregatedData = {
      machineId: machineId,
      microstops: sortedAggregatedData
  };

  oeeLogger.info('Aggregated microstops data', { aggregatedData });

  return aggregatedData;
};

module.exports = { aggregateMicrostopsByMachine };
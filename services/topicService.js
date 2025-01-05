const { apiClient, oeeLogger } = require("../src/header");

const machineApiUrl = "/workcenters"; // API endpoint for retrieving work center data
const oeeConfigApiUrl = "/oeeconfig"; // API endpoint for retrieving OEE configuration

let cache = {}; // Cache to store data for faster access
const CACHE_DURATION = 5 * 60 * 1000; // Cache duration: 5 minutes in milliseconds

/**
 * Load JSON data from the specified API endpoint.
 *
 * @param {string} apiUrl - The API endpoint to fetch data from.
 * @returns {Promise<Object>} - A promise that resolves to the JSON data from the API.
 * @throws {Error} - Throws an error if the API call fails.
 */
const loadJsonFromApi = async (apiUrl) => {
    try {
        const response = await apiClient.get(apiUrl); // Perform a GET request using the apiClient
        return response.data; // Return the JSON response from the API
    } catch (error) {
        oeeLogger.error(`Error loading data from API (${apiUrl}): ${error.message}`); // Log the error
        throw new Error(`Failed to fetch data from API: ${apiUrl}`); // Throw a new error with details
    }
};

/**
 * Check if the cached data for a given key is still valid.
 *
 * @param {string} cacheKey - The key to check in the cache.
 * @returns {Object|null} - The cached data if valid, or null if the cache is invalid or expired.
 */
const isCacheValid = (cacheKey) => {
    const cachedData = cache[cacheKey];
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        return cachedData.data; // Return cached data if it is still valid
    }
    return null; // Return null if the cache is invalid or expired
};

/**
 * Store data in the cache with a timestamp for future validity checks.
 *
 * @param {string} cacheKey - The key under which the data will be stored.
 * @param {Object} data - The data to store in the cache.
 */
const cacheData = (cacheKey, data) => {
    cache[cacheKey] = {
        data,
        timestamp: Date.now(), // Store the current timestamp for cache validation
    };
};

/**
 * Generate MQTT topics based on machine data and OEE configuration.
 *
 * @param {string} plant - The plant identifier to filter machines.
 * @param {string} area - The area identifier to filter machines.
 * @param {string} line - The line identifier to filter machines.
 * @returns {Promise<string[]>} - A promise that resolves to an array of generated MQTT topics.
 * @throws {Error} - Throws an error if fetching data or generating topics fails.
 */
const generateTopics = async (plant, area, line) => {
    try {
        const cacheKey = `topics_${plant}_${area}_${line}`; // Unique cache key based on plant, area, and line

        // Check if topics are already cached and still valid
        const cachedTopics = isCacheValid(cacheKey);
        if (cachedTopics) {
            oeeLogger.info("Returning cached topics"); // Log cache usage
            return cachedTopics;
        }

        // Fetch machine data and OEE configuration concurrently
        const [machines, oeeConfig] = await Promise.all([
            loadJsonFromApi(machineApiUrl),
            loadJsonFromApi(oeeConfigApiUrl),
        ]);

        oeeLogger.info("Loaded work centers and OEE configuration");

        // Utility function to sanitize strings by removing invalid characters
        const sanitize = (value) => {
            if (!value) return "";
            return value
                .toString()
                .trim() // Remove leading and trailing whitespace
                .replace(/\s+/g, "_") // Replace spaces with underscores
                .replace(/[^a-zA-Z0-9\/_-]/g, ""); // Remove invalid characters
        };

        const topics = []; // Array to hold the generated topics

        // Iterate over machine data to generate topics
        Object.values(machines).forEach((machine) => {
            // Filter machines by plant, area, and line
            if (
                (plant && machine.plant !== plant) ||
                (area && machine.area !== area) ||
                (line && machine.name !== line)
            ) {
                return; // Skip machines that don't match the filter
            }

            // Iterate over OEE configuration metrics to generate topics
            Object.values(oeeConfig).forEach((metric) => {
                // Determine the command type: "DDATA" for metrics, "DCMD" for commands
                const command = metric.command === "metrics" ? "DDATA" : "DCMD";

                // Construct the MQTT topic
                const topic = `spBv1.0/${sanitize(machine.plant)}/${sanitize(machine.area)}/${sanitize(command)}/${sanitize(machine.name)}/${sanitize(metric.key)}`;
                topics.push(topic); // Add the topic to the array
            });
        });

        // Store the generated topics in the cache
        cacheData(cacheKey, topics);

        return topics; // Return the generated topics
    } catch (error) {
        oeeLogger.error(`Error generating MQTT topics: ${error.message}`); // Log the error
        throw error; // Rethrow the error for further handling
    }
};

module.exports = { generateTopics };

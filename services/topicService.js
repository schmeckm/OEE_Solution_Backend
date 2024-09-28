const path = require('path');
const fs = require('fs').promises;

let cache = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 Minuten in Millisekunden

// Load JSON data from a file
const loadJsonFile = async(filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error loading JSON file from ${filePath}:`, error);
        throw error;
    }
};

// Check if data is in cache and not expired
const isCacheValid = (cacheKey) => {
    const cachedData = cache[cacheKey];
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        return cachedData.data; // Return cached data if still valid
    }
    return null; // Cache is invalid or not found
};

// Store data in cache
const cacheData = (cacheKey, data) => {
    cache[cacheKey] = {
        data,
        timestamp: Date.now(),
    };
};

// Generate topics based on machine and OEE configuration
const generateTopics = async(plant, area, line) => {
    try {
        const cacheKey = `topics_${plant}_${area}_${line}`;

        // Check if we have valid cached data
        const cachedTopics = isCacheValid(cacheKey);
        if (cachedTopics) {
            console.log("Returning cached topics");
            return cachedTopics;
        }

        const machineFilePath = path.resolve(__dirname, '../data/machine.json');
        const oeeConfigFilePath = path.resolve(__dirname, '../config/oeeConfig.json');

        const machines = await loadJsonFile(machineFilePath);
        const oeeConfig = await loadJsonFile(oeeConfigFilePath);

        const topics = [];

        machines.forEach(machine => {
            // Filter based on Plant, Area, and Line
            if ((plant && machine.Plant !== plant) ||
                (area && machine.area !== area) ||
                (line && machine.name !== line)) {
                return;
            }

            // Iterate over all metrics in OEE config
            Object.keys(oeeConfig).forEach(metric => {
                const metricConfig = oeeConfig[metric];
                const command = metricConfig.command || "metrics"; // Default to "metrics" if command is not found

                const topic = `spBv1.0/${machine.Plant}/${machine.area}/${command}/${machine.name}/${metric}`;
                topics.push(topic);
            });
        });

        // Cache the generated topics
        cacheData(cacheKey, topics);

        return topics;
    } catch (error) {
        console.error("Error generating MQTT topics:", error);
        throw error;
    }
};

module.exports = { generateTopics };
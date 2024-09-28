const fs = require('fs');
const path = require('path');

const OEE_CONFIG_FILE = path.join(__dirname, '../config/oeeConfig.json');

// Cache for OEE config
let configCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // Cache time-to-live (TTL) in milliseconds (5 minutes)

// Helper function to load OEE config from the file or cache
const loadOEEConfig = () => {
    const now = Date.now();

    // Check if cache exists and is still valid (within TTL)
    if (configCache && (now - cacheTimestamp) < CACHE_TTL) {
        console.log("Returning OEE config from cache.");
        return configCache;
    }

    // Cache is expired or does not exist, load from file
    if (fs.existsSync(OEE_CONFIG_FILE)) {
        const data = fs.readFileSync(OEE_CONFIG_FILE, 'utf8');
        configCache = JSON.parse(data);
        cacheTimestamp = now; // Update cache timestamp
        console.log("OEE Config loaded from file.");
        return configCache;
    } else {
        console.log("OEE Config file does not exist.");
        return {};
    }
};

// Helper function to save OEE config to the file
const saveOEEConfig = (config) => {
    fs.writeFileSync(OEE_CONFIG_FILE, JSON.stringify(config, null, 4));
    configCache = config; // Update the cache immediately after saving
    cacheTimestamp = Date.now(); // Reset cache timestamp
    console.log("OEE Config saved and cache updated.");
};

module.exports = {
    loadOEEConfig,
    saveOEEConfig
};
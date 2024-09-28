const fs = require("fs").promises;
const path = require("path");
const moment = require("moment-timezone");
const { oeeLogger, errorLogger } = require("../utils/logger");

/**
 * Loads and parses JSON data from a file asynchronously.
 * If dateFields are provided, those fields will be converted to the specified timezone format.
 * @param {string} filePath - The path to the JSON file.
 * @param {Array<string>} [dateFields=[]] - Optional array of fields to be treated as date fields.
 * @returns {Promise<any>} A promise that resolves to the parsed JSON data.
 */
async function loadJsonData(filePath, dateFields = []) {
  try {
    oeeLogger.debug(`Loading JSON data from ${filePath}`);
    const data = await fs.readFile(filePath, "utf8");
    const jsonData = JSON.parse(data);

    if (dateFields.length > 0) {
      jsonData.forEach((item) => {
        dateFields.forEach((field) => {
          if (item[field]) {
            item[field] = moment
              .tz(item[field], "UTC")
              .tz("Europe/Berlin")
              .format("YYYY-MM-DDTHH:mm:ss.SSSZ");
          }
        });
      });
    }

    oeeLogger.debug(`Content of ${filePath} loaded and converted successfully`);
    return jsonData;
  } catch (error) {
    errorLogger.error(
      `Failed to load JSON data from ${filePath}: ${error.message}`
    );
    throw error;
  }
}

module.exports = {
  loadJsonData,
};

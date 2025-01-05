const axios = require("axios");
const dotenv = require("dotenv");
const { oeeLogger, errorLogger } = require("../utils/logger");
const moment = require("moment");
const config = require("../config/config.json");

dotenv.config();

// Constants
const OEE_API_URL = process.env.OEE_API_URL || config.oeeApiUrl;
const DATE_FORMAT = process.env.DATE_FORMAT || "YYYY-MM-DDTHH:mm:ss";
const TIMEZONE = process.env.TIMEZONE || "UTC";

// Creating an axios instance with base URL and default headers
const apiClient = axios.create({
    baseURL: OEE_API_URL,
    headers: {
        'x-api-key': process.env.API_KEY, // API key from environment variables
        'Content-Type': 'application/json',
    },
    timeout: config.apiTimeout || 5000, // Timeout in ms
});

// Adding interceptors for logging requests and responses
apiClient.interceptors.request.use(
    (request) => {
        const timestamp = moment().tz(TIMEZONE).format(DATE_FORMAT);
        request.headers["x-timestamp"] = timestamp; // Add timestamp to header
        oeeLogger.info(`API Request: ${request.method.toUpperCase()} ${request.url}`);
        oeeLogger.debug(`Request Headers: ${JSON.stringify(request.headers)}`);
        if (request.data) {
            oeeLogger.debug(`Request Data: ${JSON.stringify(request.data)}`);
        }
        return request;
    },
    (error) => {
        errorLogger.error(`API Request Error: ${error.message}`);
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => {
        oeeLogger.info(`API Response: ${response.status} ${response.statusText}`);
        oeeLogger.debug(`Response Data: ${JSON.stringify(response.data)}`);
        return response;
    },
    (error) => {
        if (error.response) {
            errorLogger.error(
                `API Response Error: ${error.response.status} - ${error.response.statusText}`
            );
            errorLogger.debug(`Response Data: ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
            errorLogger.error(`No Response Received: ${error.message}`);
        } else {
            errorLogger.error(`Request Setup Error: ${error.message}`);
        }
        return Promise.reject(error);
    }
);

module.exports = {
    axios,
    dotenv,
    oeeLogger,
    errorLogger,
    moment,
    OEE_API_URL,
    TIMEZONE,
    thresholdSeconds: config.thresholdSeconds,
    DATE_FORMAT,
    apiClient,
};

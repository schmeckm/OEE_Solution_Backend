const axios = require("axios");
const dotenv = require("dotenv");
const { oeeLogger, errorLogger } = require("../utils/logger");
const moment = require("moment");

dotenv.config();

// Constants
const OEE_API_URL = process.env.OEE_API_URL || config.oeeApiUrl;
const DATE_FORMAT = process.env.DATE_FORMAT;
const TIMEZONE = process.env.TIMEZONE;

// Creating an axios instance with base URL and default headers
const apiClient = axios.create({
    baseURL: OEE_API_URL,
    headers: {
        'x-api-key': process.env.API_KEY, // API key from environment variables
    },
});

module.exports = {
    axios,
    dotenv,
    oeeLogger,
    errorLogger,
    moment,
    OEE_API_URL,
    TIMEZONE,
    DATE_FORMAT,
    apiClient
};
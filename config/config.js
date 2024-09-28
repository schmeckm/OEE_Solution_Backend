const fs = require('fs');
const path = require('path');
const Joi = require('joi');
const dotenv = require('dotenv');

// Load .env file
dotenv.config();

const configPath = path.join(__dirname, '../config/config.json');
const structurePath = path.join(__dirname, '../config/structure.json');

let jsonConfig;
let structure;

try {
    jsonConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (err) {
    throw new Error(`Failed to load config.json: ${err.message}`);
}

try {
    structure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
} catch (err) {
    throw new Error(`Failed to load structure.json: ${err.message}`);
}

const envSchema = Joi.object({
    MQTT_BROKER_URL: Joi.string().uri().optional(),
    MQTT_BROKER_PORT: Joi.number().integer().default(1883),
    MQTT_USERNAME: Joi.string().optional(),
    MQTT_PASSWORD: Joi.string().optional(),
    TLS_KEY: Joi.string().allow(null),
    TLS_CERT: Joi.string().allow(null),
    TLS_CA: Joi.string().allow(null),
    METHOD: Joi.string().default('parris'),
    PORT: Joi.number().integer().default(3000),
    LOG_RETENTION_DAYS: Joi.number().integer().default(2),
    OEE_AS_PERCENT: Joi.boolean().default(true),
    INFLUXDB_URL: Joi.string().allow(null),
    INFLUXDB_TOKEN: Joi.string().allow(null),
    INFLUXDB_ORG: Joi.string().allow(null),
    INFLUXDB_BUCKET: Joi.string().allow(null),
    TOPIC_FORMAT: Joi.string().default('spBv1.0/group_id/message_type/edge_node_id'),
    PLANNED_DOWNTIME_API_URL: Joi.alternatives().try(Joi.string().uri(), Joi.allow(null, '')),
    OEE_API_URL: Joi.string().uri().default(jsonConfig.oeeApiUrl),
    THRESHOLD_SECONDS: Joi.number().integer().default(300),
    DATE_FORMAT: Joi.string().default(jsonConfig.dateSettings.dateFormat),
    TIMEZONE: Joi.string().default(jsonConfig.dateSettings.timezone)
}).unknown().required();

const { error, value: envVars } = envSchema.validate({
    ...process.env,
    MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || jsonConfig.mqtt.brokerUrl,
    MQTT_BROKER_PORT: process.env.MQTT_BROKER_PORT || jsonConfig.mqtt.brokerPort,
    MQTT_USERNAME: process.env.MQTT_USERNAME || jsonConfig.mqtt.username,
    MQTT_PASSWORD: process.env.MQTT_PASSWORD || jsonConfig.mqtt.password,
    OEE_API_URL: process.env.OEE_API_URL || jsonConfig.oeeApiUrl, // Add OEE API URL
});

if (error) {
    throw new Error(`Environment variables validation error: ${error.message}`);
}

const tlsKey = envVars.TLS_KEY === 'null' ? null : envVars.TLS_KEY || jsonConfig.tls.key;
const tlsCert = envVars.TLS_CERT === 'null' ? null : envVars.TLS_CERT || jsonConfig.tls.cert;
const tlsCa = envVars.TLS_CA === 'null' ? null : envVars.TLS_CA || jsonConfig.tls.ca;

module.exports = {
    mqtt: {
        brokers: {
            area: {
                url: envVars.MQTT_BROKER_URL,
                port: envVars.MQTT_BROKER_PORT
            },
            enterprise: {
                url: envVars.MQTT_BROKER_URL,
                port: envVars.MQTT_BROKER_PORT
            }
        },
        topics: jsonConfig.topics || {
            parris: 'spBv1.0/Plant1:Area1:Line1:Cell1/DDATA/device1',
            schultz: 'spBv1.0/+/+/NDATA/+'
        },
        namespace: jsonConfig.namespace || 'spBv1.0',
        tls: {
            key: tlsKey,
            cert: tlsCert,
            ca: tlsCa
        },
        auth: {
            username: envVars.MQTT_USERNAME,
            password: envVars.MQTT_PASSWORD
        }
    },
    method: envVars.METHOD || jsonConfig.method,
    structure: structure,
    logRetentionDays: envVars.LOG_RETENTION_DAYS || jsonConfig.logRetentionDays,
    oeeAsPercent: envVars.OEE_AS_PERCENT || jsonConfig.oeeAsPercent,
    oeeApiUrl: 'http://localhost:3000/api/v1', // Der grundlegende API-URL
    influxdb: {
        url: envVars.INFLUXDB_URL || jsonConfig.influxdb.url,
        token: envVars.INFLUXDB_TOKEN || jsonConfig.influxdb.token,
        org: envVars.INFLUXDB_ORG || jsonConfig.influxdb.org,
        bucket: envVars.INFLUXDB_BUCKET || jsonConfig.influxdb.bucket
    },
    topicFormat: envVars.TOPIC_FORMAT || jsonConfig.topicFormat,
    api: {
        plannedDowntimeUrl: envVars.PLANNED_DOWNTIME_API_URL || jsonConfig.plannedDowntimeApiUrl,
        oeeApiUrl: envVars.OEE_API_URL || jsonConfig.oeeApiUrl
    },
    thresholdSeconds: envVars.THRESHOLD_SECONDS || jsonConfig.thresholdSeconds,
    dateSettings: {
        dateFormat: envVars.DATE_FORMAT || jsonConfig.dateSettings.dateFormat,
        timezone: envVars.TIMEZONE || jsonConfig.dateSettings.timezone
    },
    ratings: jsonConfig.ratings || [
        { id: 1, description: 'Maintenance', color: 'orange' },
        { id: 2, description: 'Operator Error', color: 'red' },
        { id: 3, description: 'Machine Fault', color: 'blue' },
        { id: 4, description: 'Unknown', color: 'gray' },
        { id: 5, description: 'IT-OT', color: 'green' }
    ]
};
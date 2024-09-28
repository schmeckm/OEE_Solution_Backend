const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const Joi = require("joi");
const lockfile = require("proper-lockfile"); // Bibliothek für Dateisperren

const ENV_FILE = path.join(__dirname, "../.env"); // Verweis auf das Root-Verzeichnis

const envSchema = Joi.object({
  MQTT_BROKER_URL: Joi.string().uri().required(),
  MQTT_BROKER_PORT: Joi.number().integer().default(1883),
  MQTT_USERNAME: Joi.string().required(),
  MQTT_PASSWORD: Joi.string().required(),
  TLS_KEY: Joi.string().allow(null),
  TLS_CERT: Joi.string().allow(null),
  TLS_CA: Joi.string().allow(null),
  METHOD: Joi.string().default("parris"),
  PORT: Joi.number().integer().default(3000),
  LOG_RETENTION_DAYS: Joi.number().integer().default(2),
  OEE_AS_PERCENT: Joi.boolean().default(true),
  INFLUXDB_URL: Joi.string().allow(null),
  INFLUXDB_TOKEN: Joi.string().allow(null),
  INFLUXDB_ORG: Joi.string().allow(null),
  INFLUXDB_BUCKET: Joi.string().allow(null),
  TOPIC_FORMAT: Joi.string().default(
    "spBv1.0/group_id/message_type/edge_node_id"
  ),
  PLANNED_DOWNTIME_API_URL: Joi.alternatives().try(
    Joi.string().uri(),
    Joi.allow(null, "")
  ),
  THRESHOLD_SECONDS: Joi.number().integer().default(300),
})
  .unknown()
  .required();

const loadEnvConfig = () => {
  try {
    console.log(`Reading .env file from path: ${ENV_FILE}`); // Debugging-Ausgabe
    if (fs.existsSync(ENV_FILE)) {
      const data = fs.readFileSync(ENV_FILE, "utf8");
      console.log(`Successfully read .env file: ${ENV_FILE}`);
      return dotenv.parse(data);
    } else {
      console.error(`.env file not found at ${ENV_FILE}`);
      return {};
    }
  } catch (error) {
    console.error(`Error reading .env file at ${ENV_FILE}:`, error.message);
    throw error;
  }
};

const saveEnvConfig = (config) => {
  const { error, value: envVars } = envSchema.validate(config, {
    allowUnknown: true,
    stripUnknown: true,
  });
  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }

  try {
    // Datei sperren, um gleichzeitigen Zugriff zu vermeiden
    if (lockfile.checkSync(ENV_FILE)) {
      console.error(`The .env file is currently locked by another process.`);
      throw new Error("File is locked");
    }

    const release = lockfile.lockSync(ENV_FILE); // Datei sperren
    try {
      const envData = envfile.stringify(envVars);
      fs.writeFileSync(ENV_FILE, envData);
      console.log(`Successfully saved .env file: ${ENV_FILE}`);
    } finally {
      release(); // Sperre freigeben
    }
  } catch (error) {
    console.error(`Error writing to .env file at ${ENV_FILE}:`, error.message);
    throw error;
  }
};

module.exports = {
  loadEnvConfig,
  saveEnvConfig,
};

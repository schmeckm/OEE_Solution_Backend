const moment = require('moment-timezone');

// Optional: Diese Werte könnten auch aus einer config oder ENV-Variablen kommen
const DATE_FORMAT = process.env.DATE_FORMAT || "YYYY-MM-DDTHH:mm:ss[Z]";
const TIMEZONE = process.env.TIMEZONE || "Europe/Berlin";

// Überprüfe, ob die Zeitzone gültig ist
const validTimezones = moment.tz.names();
if (!validTimezones.includes(TIMEZONE)) {
  throw new Error(`Invalid timezone: ${TIMEZONE}`);
}

/**
 * Wandelt ein Datum (String oder Date) in ein UTC-Date-Objekt um,
 * das sich zur Speicherung in der DB eignet.
 *
 * @param {string|Date} dateInput - Das Datum, das umgewandelt werden soll.
 * @returns {Date|null} - Das Datum in UTC oder null, wenn die Eingabe ungültig ist.
 */
function parseDateAsUTC(dateInput) {
  if (!dateInput) return null;
  try {
    return moment.tz(dateInput, TIMEZONE).utc().toDate();
  } catch (error) {
    console.error(`Error parsing date: ${dateInput}`, error);
    return null;
  }
}

/**
 * Wandelt ein UTC-Date (z. B. direkt aus DB) in einen UTC-String gemäß ISO 8601 um.
 *
 * @param {Date} dateInput - Das Datum, das formatiert werden soll.
 * @param {string} [format=DATE_FORMAT] - Das gewünschte Ausgabeformat.
 * @returns {string|null} - Das formatierte Datum oder null, wenn die Eingabe ungültig ist.
 */
function formatDateToUTCString(dateInput, format = DATE_FORMAT) {
  if (!dateInput) return null;
  try {
    return moment.utc(dateInput).format(format);
  } catch (error) {
    console.error(`Error formatting date to UTC string: ${dateInput}`, error);
    return null;
  }
}

/**
 * Wandelt ein UTC-Date aus der DB in den konfigurierten Zeitzonen-String um.
 *
 * @param {Date} dateInput - Das Datum, das formatiert werden soll.
 * @param {string} [format='DD.MM.YYYY HH:mm:ss'] - Das gewünschte Ausgabeformat.
 * @returns {string|null} - Das formatierte Datum oder null, wenn die Eingabe ungültig ist.
 */
function formatDateToLocalString(dateInput, format = 'DD.MM.YYYY HH:mm:ss') {
  if (!dateInput) return null;
  try {
    return moment.utc(dateInput).tz(TIMEZONE).format(format);
  } catch (error) {
    console.error(`Error formatting date to local string: ${dateInput}`, error);
    return null;
  }
}

module.exports = {
  parseDateAsUTC,
  formatDateToUTCString,
  formatDateToLocalString,
};
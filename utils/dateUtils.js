// dateUtils.js
const moment = require('moment-timezone');

// Optional: Diese Werte könnten auch aus einer config oder ENV-Variablen kommen
const DATE_FORMAT = process.env.DATE_FORMAT || "YYYY-MM-DDTHH:mm:ss[Z]";
const TIMEZONE = process.env.TIMEZONE || "Europe/Berlin";

/**
 * Wandelt ein Datum (String oder Date) in ein UTC-Date-Objekt um,
 * das sich zur Speicherung in der DB eignet.
 */
function parseDateAsUTC(dateInput) {
  if (!dateInput) return null;
  // Wir nehmen an, dass dateInput in TIMEZONE kommt (z. B. Europe/Berlin),
  // und konvertieren das Ergebnis in UTC:
  return moment.tz(dateInput, TIMEZONE).utc().toDate();
}

/**
 * Wandelt ein UTC-Date (z. B. direkt aus DB) in einen UTC-String gemäß ISO 8601 um.
 * => "2025-01-02T13:00:00Z"
 */
function formatDateToUTCString(dateInput) {
  if (!dateInput) return null;
  return moment.utc(dateInput).format(DATE_FORMAT);
}

/**
 * Wandelt ein UTC-Date aus der DB in den konfigurierten Zeitzonen-String um.
 * => z. B. "02.01.2025 14:00:00" für Europe/Berlin
 */
function formatDateToLocalString(dateInput) {
  if (!dateInput) return null;
  return moment.utc(dateInput).tz(TIMEZONE).format('DD.MM.YYYY HH:mm:ss');
}

module.exports = {
  parseDateAsUTC,
  formatDateToUTCString,
  formatDateToLocalString,
};

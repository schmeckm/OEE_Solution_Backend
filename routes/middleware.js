const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

/**
 * Middleware zur Validierung und Säuberung der OEE-Daten im Request-Body.
 * Stellt sicher, dass alle notwendigen Felder vorhanden und korrekt formatiert sind.
 *
 * @param {Object} req - Das Request-Objekt.
 * @param {Object} res - Das Response-Objekt.
 * @param {Function} next - Die nächste Middleware-Funktion.
 */
function validateOEEData(req, res, next) {
  // Definiere das Joi-Schema
  const schema = Joi.object({
    plannedProductionQuantity: Joi.number().required(),
    Runtime: Joi.number().required(),
    actualPerformance: Joi.number().required(),
    targetPerformance: Joi.number().required(),
    ActualProductionYield: Joi.number().required(),
    ActualProductionQuantity: Joi.number().required(),
    // Weitere Felder hinzufügen, falls erforderlich
  });

  // Validiere den Request-Body gegen das Schema
  const { error, value } = schema.validate(req.body);

  if (error) {
    // Wenn die Validierung fehlschlägt, gib einen 400 Bad Request Fehler zurück
    return res.status(400).json({ message: `Ungültige Daten: ${error.details[0].message}` });
  }

  // Eingaben säubern
  // Da alle Felder numerisch sind, ist eine Säuberung nicht zwingend erforderlich
  // Falls String-Felder vorhanden sind, sollten diese mit sanitizeHtml gesäubert werden
  // Beispiel:
  // value.someStringField = sanitizeHtml(value.someStringField);

  // Ersetze den Request-Body durch die validierten und gesäuberten Daten
  req.body = value;

  next(); // Fahre mit der nächsten Middleware oder dem Route-Handler fort
}

/**
 * Middleware zum Fehlerhandling.
 * Loggt den Fehler-Stack in der Konsole und sendet eine entsprechende Antwort.
 *
 * @param {Object} err - Das Error-Objekt.
 * @param {Object} req - Das Request-Objekt.
 * @param {Object} res - Das Response-Objekt.
 * @param {Function} next - Die nächste Middleware-Funktion.
 */
function handleErrors(err, req, res, next) {
  console.error(err.stack); // Logge den Fehler-Stack zur Fehlerbehebung

  // Setze den Standard-Statuscode und die Nachricht
  let statusCode = 500;
  let message = 'Interner Serverfehler';

  // Behandle spezifische Fehlertypen
  if (err.isJoi) {
    // Joi-Validierungsfehler
    statusCode = 400;
    message = `Ungültige Daten: ${err.message}`;
  }

  res.status(statusCode).json({ message, error: err.message }); // Sende die Fehlerantwort
}

module.exports = { validateOEEData, handleErrors };

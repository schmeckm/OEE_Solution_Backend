const express = require('express');
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

const { loadEnvConfig, saveEnvConfig } = require('../services/settingsService');

const router = express.Router();

// Zentralisiertes Fehlerhandling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Eingabevalidierung und -säuberung
const validateAndSanitizeEnvConfig = (data) => {
  const schema = Joi.object().pattern(Joi.string(), Joi.string().allow(''));

  const { error, value } = schema.validate(data);

  if (error) {
    throw new Error(`Ungültige Konfigurationsdaten: ${error.details[0].message}`);
  }

  // Eingaben säubern
  const sanitizedData = {};
  for (const [key, val] of Object.entries(value)) {
    const sanitizedKey = sanitizeHtml(key);
    const sanitizedValue = sanitizeHtml(val);
    sanitizedData[sanitizedKey] = sanitizedValue;
  }

  return sanitizedData;
};

const validateAndSanitizeKey = (key) => {
  const schema = Joi.string().required();
  const { error, value } = schema.validate(key);

  if (error) {
    throw new Error(`Ungültiger Schlüssel: ${error.details[0].message}`);
  }

  return sanitizeHtml(value);
};

/**
 * @swagger
 * tags:
 *   name: Environment Configuration
 *   description: API zur Verwaltung von Umgebungs-Konfigurationseinstellungen
 */

/**
 * @swagger
 * /settings/env:
 *   get:
 *     summary: Gesamte Umgebungs-Konfiguration abrufen
 *     tags: [Environment Configuration]
 *     description: Ruft alle Einstellungen aus der `.env`-Datei ab.
 *     responses:
 *       200:
 *         description: Eine Liste aller Umgebungs-Einstellungen.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get(
  '/env',
  asyncHandler(async (req, res) => {
    try {
      const envConfig = await loadEnvConfig();
      res.json(envConfig);
    } catch (error) {
      res.status(500).json({ message: 'Fehler beim Laden der Umgebungs-Konfiguration' });
    }
  })
);

/**
 * @swagger
 * /settings/env:
 *   put:
 *     summary: Gesamte Umgebungs-Konfiguration aktualisieren
 *     tags: [Environment Configuration]
 *     description: Aktualisiert alle Einstellungen in der `.env`-Datei.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Die aktualisierten Konfigurationswerte.
 *     responses:
 *       200:
 *         description: Umgebungs-Konfiguration erfolgreich aktualisiert.
 *       400:
 *         description: Ungültige Konfigurationsdaten.
 *       500:
 *         description: Interner Serverfehler.
 */
router.put(
  '/env',
  asyncHandler(async (req, res) => {
    try {
      const newEnvConfig = validateAndSanitizeEnvConfig(req.body);
      await saveEnvConfig(newEnvConfig);
      res.status(200).json({ message: 'Umgebungs-Konfiguration erfolgreich aktualisiert' });
    } catch (error) {
      if (error.message.startsWith('Ungültige Konfigurationsdaten')) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Fehler beim Aktualisieren der Umgebungs-Konfiguration' });
      }
    }
  })
);

/**
 * @swagger
 * /settings/env/{key}:
 *   get:
 *     summary: Eine bestimmte Umgebungs-Einstellung abrufen
 *     tags: [Environment Configuration]
 *     description: Ruft den Wert eines bestimmten Schlüssels aus der `.env`-Datei ab.
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Der Umgebungs-Schlüssel, der abgerufen werden soll.
 *     responses:
 *       200:
 *         description: Der Wert des angegebenen Umgebungs-Schlüssels.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: string
 *       400:
 *         description: Ungültiger Schlüssel.
 *       404:
 *         description: Schlüssel nicht gefunden.
 *       500:
 *         description: Interner Serverfehler.
 */
router.get(
  '/env/:key',
  asyncHandler(async (req, res) => {
    try {
      const key = validateAndSanitizeKey(req.params.key);
      const envConfig = await loadEnvConfig();
      if (envConfig[key] !== undefined) {
        res.json({ [key]: envConfig[key] });
      } else {
        res.status(404).json({ message: `Schlüssel '${key}' nicht gefunden` });
      }
    } catch (error) {
      if (error.message.startsWith('Ungültiger Schlüssel')) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Fehler beim Laden der Umgebungs-Konfiguration' });
      }
    }
  })
);

/**
 * @swagger
 * /settings/env/{key}:
 *   put:
 *     summary: Eine bestimmte Umgebungs-Einstellung aktualisieren
 *     tags: [Environment Configuration]
 *     description: Aktualisiert den Wert eines bestimmten Schlüssels in der `.env`-Datei.
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Der Umgebungs-Schlüssel, der aktualisiert werden soll.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Schlüssel erfolgreich aktualisiert.
 *       400:
 *         description: Ungültiger Schlüssel oder Wert.
 *       500:
 *         description: Interner Serverfehler.
 */
router.put(
  '/env/:key',
  asyncHandler(async (req, res) => {
    try {
      const key = validateAndSanitizeKey(req.params.key);
      const schema = Joi.object({
        value: Joi.string().allow('').required(),
      });
      const { error, value } = schema.validate(req.body);
      if (error) {
        throw new Error(`Ungültiger Wert: ${error.details[0].message}`);
      }

      const sanitizedValue = sanitizeHtml(value.value);

      const envConfig = await loadEnvConfig();
      envConfig[key] = sanitizedValue;
      await saveEnvConfig(envConfig);
      res.status(200).json({ message: `Schlüssel '${key}' erfolgreich aktualisiert` });
    } catch (error) {
      if (error.message.startsWith('Ungültig')) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Fehler beim Aktualisieren der Umgebungs-Konfiguration' });
      }
    }
  })
);

/**
 * @swagger
 * /settings/env:
 *   post:
 *     summary: Neue Umgebungs-Einstellungen hinzufügen
 *     tags: [Environment Configuration]
 *     description: Fügt neue Schlüssel-Wert-Paare zur `.env`-Datei hinzu.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties:
 *               type: string
 *     responses:
 *       201:
 *         description: Neue Konfiguration erfolgreich hinzugefügt.
 *       400:
 *         description: Ungültige Konfigurationsdaten.
 *       500:
 *         description: Interner Serverfehler.
 */
router.post(
  '/env',
  asyncHandler(async (req, res) => {
    try {
      const newConfig = validateAndSanitizeEnvConfig(req.body);
      const envConfig = await loadEnvConfig();
      for (let key in newConfig) {
        envConfig[key] = newConfig[key];
      }
      await saveEnvConfig(envConfig);
      res.status(201).json({ message: 'Neue Konfiguration erfolgreich hinzugefügt' });
    } catch (error) {
      if (error.message.startsWith('Ungültige Konfigurationsdaten')) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Fehler beim Hinzufügen der neuen Konfiguration' });
      }
    }
  })
);

/**
 * @swagger
 * /settings/env/{key}:
 *   delete:
 *     summary: Eine bestimmte Umgebungs-Einstellung löschen
 *     tags: [Environment Configuration]
 *     description: Entfernt ein Schlüssel-Wert-Paar aus der `.env`-Datei.
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Der Umgebungs-Schlüssel, der gelöscht werden soll.
 *     responses:
 *       204:
 *         description: Schlüssel erfolgreich gelöscht.
 *       400:
 *         description: Ungültiger Schlüssel.
 *       404:
 *         description: Schlüssel nicht gefunden.
 *       500:
 *         description: Interner Serverfehler.
 */
router.delete(
  '/env/:key',
  asyncHandler(async (req, res) => {
    try {
      const key = validateAndSanitizeKey(req.params.key);
      const envConfig = await loadEnvConfig();
      if (envConfig[key] !== undefined) {
        delete envConfig[key];
        await saveEnvConfig(envConfig);
        res.status(204).send();
      } else {
        res.status(404).json({ message: `Schlüssel '${key}' nicht gefunden` });
      }
    } catch (error) {
      if (error.message.startsWith('Ungültiger Schlüssel')) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Fehler beim Löschen des Umgebungs-Schlüssels' });
      }
    }
  })
);

module.exports = router;

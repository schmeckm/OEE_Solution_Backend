const express = require('express');
const { loadOEEConfig, saveOEEConfig } = require('../services/oeeConfigService');
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

const router = express.Router();

// Zentralisiertes Fehlerhandling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Eingabevalidierung und -säuberung
const validateAndSanitizeConfigs = (configs) => {
  const schema = Joi.array().items(
    Joi.object({
      key: Joi.string().required(),
      // Hier weitere Validierung für die anderen Eigenschaften des Config-Objekts
      // Zum Beispiel:
      // value: Joi.any().required(),
      // Weitere Felder entsprechend hinzufügen
    })
  );

  const { error, value } = schema.validate(configs);

  if (error) {
    throw new Error(`Ungültige Konfigurationsdaten: ${error.details[0].message}`);
  }

  // Eingabesäuberung
  const sanitizedConfigs = value.map((config) => {
    const sanitizedConfig = {};
    for (const [key, val] of Object.entries(config)) {
      if (typeof val === 'string') {
        sanitizedConfig[key] = sanitizeHtml(val);
      } else {
        sanitizedConfig[key] = val;
      }
    }
    return sanitizedConfig;
  });

  return sanitizedConfigs;
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
 *   name: OEE Configuration
 *   description: API zur Verwaltung von OEE-Konfigurationen
 */

/**
 * @swagger
 * /oeeconfig:
 *   get:
 *     summary: Gesamte OEE-Konfiguration abrufen
 *     tags: [OEE Configuration]
 *     description: Ruft die gesamte OEE-Konfiguration als Array ab.
 *     responses:
 *       200:
 *         description: Die gesamte OEE-Konfiguration als Array.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Fehler beim Abrufen der OEE-Konfiguration.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const oeeConfig = await loadOEEConfig();

      // Format the object into an array
      const formattedData = Object.entries(oeeConfig).map(([key, value]) => ({
        key, // Add the key as a property
        ...value, // Spread the rest of the properties
      }));

      res.status(200).json(formattedData);
    } catch (error) {
      console.error('Error loading OEE configuration:', error);
      res.status(500).json({ message: 'Fehler beim Abrufen der OEE-Konfiguration' });
    }
  })
);

/**
 * @swagger
 * /oeeconfig/{key}:
 *   get:
 *     summary: Eine spezifische OEE-Konfiguration abrufen
 *     tags: [OEE Configuration]
 *     description: Ruft den Wert eines bestimmten OEE-Konfigurationsschlüssels ab.
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Der OEE-Konfigurationsschlüssel, der abgerufen werden soll.
 *     responses:
 *       200:
 *         description: Der Wert des angegebenen OEE-Konfigurationsschlüssels.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Ungültiger Schlüssel.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Schlüssel nicht gefunden.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Fehler beim Abrufen des Schlüssels.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:key',
  asyncHandler(async (req, res) => {
    try {
      const key = validateAndSanitizeKey(req.params.key);

      const oeeConfig = await loadOEEConfig();
      if (oeeConfig[key] !== undefined) {
        res.status(200).json({
          key,
          ...oeeConfig[key],
        });
      } else {
        res.status(404).json({ message: `Schlüssel '${key}' nicht gefunden` });
      }
    } catch (error) {
      if (error.message.startsWith('Ungültiger Schlüssel')) {
        res.status(400).json({ message: error.message });
      } else {
        console.error('Error loading OEE configuration:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen des Schlüssels' });
      }
    }
  })
);

/**
 * @swagger
 * /oeeconfig:
 *   post:
 *     summary: Neue OEE-Konfiguration hinzufügen
 *     tags: [OEE Configuration]
 *     description: Fügt neue Schlüssel-Wert-Paare zur OEE-Konfiguration hinzu.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - key
 *               properties:
 *                 key:
 *                   type: string
 *                 # Weitere Eigenschaften hier hinzufügen
 *     responses:
 *       201:
 *         description: Neue OEE-Konfiguration erfolgreich hinzugefügt.
 *       400:
 *         description: Ungültige Konfigurationsdaten.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Fehler beim Hinzufügen der OEE-Konfiguration.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const oeeConfig = await loadOEEConfig();
      const newConfigs = req.body;

      if (!Array.isArray(newConfigs)) {
        return res.status(400).json({ message: 'Anfragetext muss ein Array von Konfigurationen sein.' });
      }

      const sanitizedConfigs = validateAndSanitizeConfigs(newConfigs);

      // Alle neuen Konfigurationen hinzufügen
      sanitizedConfigs.forEach((config) => {
        oeeConfig[config.key] = config;
      });

      await saveOEEConfig(oeeConfig);
      res.status(201).json({ message: 'Neue OEE-Konfigurationen erfolgreich hinzugefügt' });
    } catch (error) {
      if (error.message.startsWith('Ungültige Konfigurationsdaten')) {
        res.status(400).json({ message: error.message });
      } else {
        console.error('Error adding OEE configuration:', error);
        res.status(500).json({ message: 'Fehler beim Hinzufügen der OEE-Konfiguration' });
      }
    }
  })
);

/**
 * @swagger
 * /oeeconfig/{key}:
 *   put:
 *     summary: Eine bestehende OEE-Konfiguration aktualisieren
 *     tags: [OEE Configuration]
 *     description: Aktualisiert den Wert eines spezifischen OEE-Konfigurationsschlüssels.
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Der OEE-Konfigurationsschlüssel, der aktualisiert werden soll.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Hier die zu aktualisierenden Eigenschaften definieren
 *     responses:
 *       200:
 *         description: OEE-Konfiguration erfolgreich aktualisiert.
 *       400:
 *         description: Ungültige Eingabedaten oder Schlüssel.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Schlüssel nicht gefunden.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Fehler beim Aktualisieren der OEE-Konfiguration.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  '/:key',
  asyncHandler(async (req, res) => {
    try {
      const key = validateAndSanitizeKey(req.params.key);
      const updatedConfig = req.body;

      // Validierung der Eingabedaten
      const schema = Joi.object().required();
      const { error, value } = schema.validate(updatedConfig);
      if (error) {
        return res.status(400).json({ message: `Ungültige Eingabedaten: ${error.details[0].message}` });
      }

      // Eingabesäuberung
      const sanitizedConfig = {};
      for (const [k, v] of Object.entries(value)) {
        if (typeof v === 'string') {
          sanitizedConfig[k] = sanitizeHtml(v);
        } else {
          sanitizedConfig[k] = v;
        }
      }

      const oeeConfig = await loadOEEConfig();

      if (oeeConfig[key] !== undefined) {
        oeeConfig[key] = { ...oeeConfig[key], ...sanitizedConfig };
        await saveOEEConfig(oeeConfig);
        res.status(200).json({ message: `Schlüssel '${key}' erfolgreich aktualisiert.` });
      } else {
        res.status(404).json({ message: `Schlüssel '${key}' nicht gefunden.` });
      }
    } catch (error) {
      if (error.message.startsWith('Ungültige Eingabedaten') || error.message.startsWith('Ungültiger Schlüssel')) {
        res.status(400).json({ message: error.message });
      } else {
        console.error('Fehler beim Aktualisieren der OEE-Konfiguration:', error);
        res.status(500).json({ message: 'Fehler beim Aktualisieren der OEE-Konfiguration.' });
      }
    }
  })
);

/**
 * @swagger
 * /oeeconfig/{key}:
 *   delete:
 *     summary: Eine spezifische OEE-Konfiguration löschen
 *     tags: [OEE Configuration]
 *     description: Entfernt ein Schlüssel-Wert-Paar aus der OEE-Konfiguration.
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Der OEE-Konfigurationsschlüssel, der gelöscht werden soll.
 *     responses:
 *       200:
 *         description: Schlüssel erfolgreich gelöscht.
 *       400:
 *         description: Ungültiger Schlüssel.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Schlüssel nicht gefunden.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Fehler beim Löschen des Schlüssels.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  '/:key',
  asyncHandler(async (req, res) => {
    try {
      const key = validateAndSanitizeKey(req.params.key);

      const oeeConfig = await loadOEEConfig();

      if (oeeConfig[key] !== undefined) {
        delete oeeConfig[key];
        await saveOEEConfig(oeeConfig);
        res.status(200).json({ message: `Schlüssel '${key}' erfolgreich gelöscht` });
      } else {
        res.status(404).json({ message: `Schlüssel '${key}' nicht gefunden` });
      }
    } catch (error) {
      if (error.message.startsWith('Ungültiger Schlüssel')) {
        res.status(400).json({ message: error.message });
      } else {
        console.error('Error deleting OEE configuration:', error);
        res.status(500).json({ message: 'Fehler beim Löschen des Schlüssels' });
      }
    }
  })
);

module.exports = router;

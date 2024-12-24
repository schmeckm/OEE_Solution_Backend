const express = require("express");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");

const { loadUnplannedDowntime, loadUnplannedDowntimeById, createUnplannedDowntime, updateUnplannedDowntime, deleteUnplannedDowntime } = require("../services/unplannedDowntimeService");

const router = express.Router();

// Fehlerbehandlung
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Utility-Funktion zur Berechnung der Dauer in Minuten
const calculateDurationInMinutes = (start, end) => {
  const startTime = moment(start);
  const endTime = moment(end);
  return endTime.diff(startTime, "minutes");
};

// Utility-Funktion zur Datumsformatierung
const formatDate = (date) =>
  date ? moment(date).format("YYYY-MM-DDTHH:mm:ss") : null;

/**
 * @swagger
 * tags:
 *   name: Unplanned Downtime
 *   description: API zur Verwaltung ungeplanter Stillstandszeiten
 */

/**
 * @swagger
 * /unplanneddowntime:
 *   get:
 *     summary: Alle ungeplanten Stillstandszeiten abrufen
 *     tags: [Unplanned Downtime]
 *     responses:
 *       200:
 *         description: Eine Liste von ungeplanten Stillstandszeiten
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UnplannedDowntime'
 */
router.get("/", asyncHandler(async (req, res) => {
  try {
    const data = await loadUnplannedDowntime();
    // Gebe nur die reinen Daten ohne Metadaten zurück
    const sanitizedData = data.map(item => item.dataValues);
    res.json(sanitizedData);
  } catch (error) {
    console.error("Fehler beim Laden der ungeplanten Stillstandszeiten:", error.stack);
    res.status(500).json({ message: "Fehler beim Laden der ungeplanten Stillstandszeiten", error: error.stack });
  }
}));

/**
 * @swagger
 * /unplanneddowntime:
 *   post:
 *     summary: Eine neue ungeplante Stillstandszeit hinzufügen
 *     tags: [Unplanned Downtime]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UnplannedDowntimeInput'
 *     responses:
 *       201:
 *         description: Ungeplante Stillstandszeit erfolgreich hinzugefügt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnplannedDowntime'
 *       400:
 *         description: Ungültige Eingabedaten
 */
router.post("/", asyncHandler(async (req, res) => {
  try {
    // Eingabedaten validieren und säubern
    const sanitizedData = req.body;

    // ID generieren
    sanitizedData.ID = uuidv4();
    sanitizedData.Start = formatDate(sanitizedData.Start);
    sanitizedData.End = formatDate(sanitizedData.End);
    sanitizedData.durationInMinutes = calculateDurationInMinutes(sanitizedData.Start, sanitizedData.End);

    // Speichern der neuen ungeplanten Stillstandszeit
    const savedData = await createUnplannedDowntime(sanitizedData);

    // Gebe die vollständigen, gesäuberten Daten zurück
    res.status(201).json(savedData.dataValues);  // Hier wird die Antwort mit den Daten zurückgegeben
  } catch (error) {
    res.status(400).json({ message: `Fehler beim Erstellen der ungeplanten Stillstandszeit: ${error.message}` });
  }
}));

/**
 * @swagger
 * /unplanneddowntime/{id}:
 *   put:
 *     summary: Eine ungeplante Stillstandszeit aktualisieren
 *     tags: [Unplanned Downtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die ID der ungeplanten Stillstandszeit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UnplannedDowntimeInput'
 *     responses:
 *       200:
 *         description: Ungeplante Stillstandszeit erfolgreich aktualisiert
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnplannedDowntime'
 *       400:
 *         description: Ungültige Eingabedaten
 *       404:
 *         description: Ungeplante Stillstandszeit nicht gefunden
 */
router.put("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;

  /**
   * An object containing updated data for unplanned downtime.
   * 
   * @typedef {Object} UpdatedData
   * @property {string} Start - The formatted start date of the downtime.
   * @property {string} End - The formatted end date of the downtime.
   * @property {number} durationInMinutes - The calculated duration of the downtime in minutes.
   * @property {Object} req.body - The original request body containing additional properties.
   */
  const updatedData = {
    ...req.body,
    Start: formatDate(req.body.Start),
    End: formatDate(req.body.End),
    durationInMinutes: calculateDurationInMinutes(req.body.Start, req.body.End),
  };

  try {
    const updatedUnplannedDowntime = await updateUnplannedDowntime(id, updatedData);
    if (!updatedUnplannedDowntime) {
      return res.status(404).json({ message: "Ungeplante Stillstandszeit nicht gefunden" });
    }
    res.status(200).json(updatedUnplannedDowntime.dataValues);  // Rückgabe der aktualisierten Daten
  } catch (error) {
    res.status(500).json({ message: `Fehler beim Aktualisieren der ungeplanten Stillstandszeit: ${error.message}` });
  }
}));

/**
 * @swagger
 * /unplanneddowntime/{id}:
 *   get:
 *     summary: Abrufen einer ungeplanten Stillstandszeit nach ID
 *     tags: [Unplanned Downtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die ID der ungeplanten Stillstandszeit
 *     responses:
 *       200:
 *         description: Die ungeplante Stillstandszeit mit der angegebenen ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnplannedDowntime'
 *       404:
 *         description: Ungeplante Stillstandszeit nicht gefunden
 */
router.get("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;  // Hole die ID aus den URL-Parametern
  console.log("Suchst du nach der ungeplanten Stillstandszeit mit ID: ", id);

  try {
    // Lade die ungeplante Stillstandszeit anhand der ID
    const unplannedDowntime = await loadUnplannedDowntimeById(id);

    if (!unplannedDowntime) {
      return res.status(404).json({ message: `Ungeplante Stillstandszeit mit ID ${id} nicht gefunden` });
    }

    // Gebe nur die Daten der ungeplanten Stillstandszeit ohne zusätzliche Metadaten zurück
    const sanitizedData = unplannedDowntime.dataValues;  // Nur die reinen Daten zurückgeben
    console.log("Ungeplante Stillstandszeit gefunden: ", sanitizedData);  // Debugging-Ausgabe

    if (!sanitizedData) {
      console.error("Die Daten der ungeplanten Stillstandszeit sind leer!");
      return res.status(500).json({ message: "Die Daten der ungeplanten Stillstandszeit sind leer!" });
    }

    res.json(sanitizedData);  // Nur die `dataValues` zurückgeben
  } catch (error) {
    console.error(`Fehler beim Abrufen der ungeplanten Stillstandszeit mit ID ${id}: ${error.message}`);
    res.status(500).json({ message: `Fehler beim Abrufen der ungeplanten Stillstandszeit mit ID ${id}: ${error.message}` });
  }
}));

/**
 * @swagger
 * /unplanneddowntime/{id}:
 *   delete:
 *     summary: Eine ungeplante Stillstandszeit löschen
 *     tags: [Unplanned Downtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die ID der ungeplanten Stillstandszeit
 *     responses:
 *       204:
 *         description: Ungeplante Stillstandszeit erfolgreich gelöscht
 *       404:
 *         description: Ungeplante Stillstandszeit nicht gefunden
 */
router.delete("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;  // Hole die ID aus den URL-Parametern

  try {
    // Lösche die ungeplante Stillstandszeit
    const result = await deleteUnplannedDowntime(id);

    if (result) {
      res.status(204).send();  // Erfolgreiches Löschen
    } else {
      res.status(404).json({ message: "Ungeplante Stillstandszeit nicht gefunden" });
    }
  } catch (error) {
    res.status(500).json({ message: `Fehler beim Löschen der ungeplanten Stillstandszeit: ${error.message}` });
  }
}));

module.exports = router;

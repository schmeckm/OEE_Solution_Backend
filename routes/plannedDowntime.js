const express = require("express");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");

const { loadPlannedDowntime, loadPlannedDowntimeById, createPlannedDowntime, updatePlannedDowntime, deletePlannedDowntime } = require("../services/plannedDowntimeService");

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
 *   name: Planned Downtime
 *   description: API zur Verwaltung geplanter Stillstandszeiten
 */

/**
 * @swagger
 * /planneddowntime:
 *   get:
 *     summary: Alle geplanten Stillstandszeiten abrufen
 *     tags: [Planned Downtime]
 *     responses:
 *       200:
 *         description: Eine Liste von geplanten Stillstandszeiten
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PlannedDowntime'
 */
router.get("/", asyncHandler(async (req, res) => {
  try {
    const data = await loadPlannedDowntime();
    // Gebe nur die reinen Daten ohne Metadaten zurück
    const sanitizedData = data.map(item => item.dataValues);
    res.json(sanitizedData);
  } catch (error) {
    console.error("Fehler beim Laden der geplanten Stillstandszeiten:", error.stack);
    res.status(500).json({ message: "Fehler beim Laden der geplanten Stillstandszeiten", error: error.stack });
  }
}));

/**
 * @swagger
 * /planneddowntime:
 *   post:
 *     summary: Eine neue geplante Stillstandszeit hinzufügen
 *     tags: [Planned Downtime]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PlannedDowntimeInput'
 *     responses:
 *       201:
 *         description: Geplante Stillstandszeit erfolgreich hinzugefügt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlannedDowntime'
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

    // Speichern der neuen geplanten Stillstandszeit
    const savedData = await createPlannedDowntime(sanitizedData);

    // Gebe die vollständigen, gesäuberten Daten zurück
    res.status(201).json(savedData.dataValues);  // Hier wird die Antwort mit den Daten zurückgegeben
  } catch (error) {
    res.status(400).json({ message: `Fehler beim Erstellen der geplanten Stillstandszeit: ${error.message}` });
  }
}));


/**
 * @swagger
 * /planneddowntime/{id}:
 *   put:
 *     summary: Eine geplante Stillstandszeit aktualisieren
 *     tags: [Planned Downtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die ID der geplanten Stillstandszeit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PlannedDowntimeInput'
 *     responses:
 *       200:
 *         description: Geplante Stillstandszeit erfolgreich aktualisiert
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlannedDowntime'
 *       400:
 *         description: Ungültige Eingabedaten
 *       404:
 *         description: Geplante Stillstandszeit nicht gefunden
 */
router.put("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;

  const updatedData = {
    ...req.body,
    Start: formatDate(req.body.Start),
    End: formatDate(req.body.End),
    durationInMinutes: calculateDurationInMinutes(req.body.Start, req.body.End),
  };

  try {
    const updatedPlannedDowntime = await updatePlannedDowntime(id, updatedData);
    if (!updatedPlannedDowntime) {
      return res.status(404).json({ message: "Geplante Stillstandszeit nicht gefunden" });
    }
    res.status(200).json(updatedPlannedDowntime.dataValues);  // Rückgabe der aktualisierten Daten
  } catch (error) {
    res.status(500).json({ message: `Fehler beim Aktualisieren der geplanten Stillstandszeit: ${error.message}` });
  }
}));

/**
 * @swagger
 * /planneddowntime/{id}:
 *   get:
 *     summary: Abrufen einer geplanten Stillstandszeit nach ID
 *     tags: [Planned Downtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die ID der geplanten Stillstandszeit
 *     responses:
 *       200:
 *         description: Die geplante Stillstandszeit mit der angegebenen ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlannedDowntime'
 *       404:
 *         description: Geplante Stillstandszeit nicht gefunden
 */
router.get("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;  // Hole die ID aus den URL-Parametern
  console.log("Suchst du nach der geplanten Stillstandszeit mit ID: ", id);

  try {
    // Lade die geplante Stillstandszeit anhand der ID
    const plannedDowntime = await loadPlannedDowntimeById(id);

    if (!plannedDowntime) {
      return res.status(404).json({ message: `Geplante Stillstandszeit mit ID ${id} nicht gefunden` });
    }

    // Gebe nur die Daten der geplanten Stillstandszeit ohne zusätzliche Metadaten zurück
    const sanitizedData = plannedDowntime.dataValues;  // Nur die reinen Daten zurückgeben
    console.log("Geplante Stillstandszeit gefunden: ", sanitizedData);  // Debugging-Ausgabe

    if (!sanitizedData) {
      console.error("Die Daten der geplanten Stillstandszeit sind leer!");
      return res.status(500).json({ message: "Die Daten der geplanten Stillstandszeit sind leer!" });
    }

    res.json(sanitizedData);  // Nur die `dataValues` zurückgeben
  } catch (error) {
    console.error(`Fehler beim Abrufen der geplanten Stillstandszeit mit ID ${id}: ${error.message}`);
    res.status(500).json({ message: `Fehler beim Abrufen der geplanten Stillstandszeit mit ID ${id}: ${error.message}` });
  }
}));




/**
 * @swagger
 * /planneddowntime/{id}:
 *   delete:
 *     summary: Eine geplante Stillstandszeit löschen
 *     tags: [Planned Downtime]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die ID der geplanten Stillstandszeit
 *     responses:
 *       204:
 *         description: Geplante Stillstandszeit erfolgreich gelöscht
 *       404:
 *         description: Geplante Stillstandszeit nicht gefunden
 */
// DELETE-Route zum Löschen der geplanten Stillstandszeit
router.delete("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;  // Hole die ID aus den URL-Parametern

  try {
    // Lösche die geplante Stillstandszeit
    const result = await deletePlannedDowntime(id);

    if (result) {
      res.status(204).send();  // Erfolgreiches Löschen
    } else {
      res.status(404).json({ message: "Geplante Stillstandszeit nicht gefunden" });
    }
  } catch (error) {
    res.status(500).json({ message: `Fehler beim Löschen der geplanten Stillstandszeit: ${error.message}` });
  }
}));



module.exports = router;

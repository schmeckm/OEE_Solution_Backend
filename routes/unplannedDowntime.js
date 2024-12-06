const express = require("express");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");
const Joi = require("joi");
const sanitizeHtml = require("sanitize-html");

const {
  loadPlannedDowntime,
  savePlannedDowntime,
} = require("../services/plannedDowntimeService");

const router = express.Router();

// Zentralisiertes Fehlerhandling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Eingabedaten validieren und säubern
const validateAndSanitizeDowntime = (data) => {
  // Joi-Schema für geplante Stillstandszeiten
  const schema = Joi.object({
    Start: Joi.date().required(),
    End: Joi.date().required(),
    ProcessOrderNumber: Joi.string().required(),
    machine_id: Joi.string().required(),
    // Weitere erforderliche Felder hinzufügen
  });

  // Validierung
  const { error, value } = schema.validate(data);

  if (error) {
    throw new Error(error.details[0].message);
  }

  // Eingaben säubern
  value.ProcessOrderNumber = sanitizeHtml(value.ProcessOrderNumber);
  value.machine_id = sanitizeHtml(value.machine_id);

  return value;
};

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
router.get(
  "/",
  asyncHandler(async (req, res) => {
    try {
      let data = await loadPlannedDowntime();
      data = data.map((downtime) => ({
        ...downtime,
        durationInMinutes: calculateDurationInMinutes(downtime.Start, downtime.End),
      }));
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Fehler beim Laden der geplanten Stillstandszeiten" });
    }
  })
);

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
router.post(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const data = await loadPlannedDowntime();
      const sanitizedData = validateAndSanitizeDowntime(req.body);

      // Neue ID generieren
      sanitizedData.ID = uuidv4();

      // Datumsfelder formatieren
      sanitizedData.Start = formatDate(sanitizedData.Start);
      sanitizedData.End = formatDate(sanitizedData.End);

      // Dauer in Minuten berechnen
      sanitizedData.durationInMinutes = calculateDurationInMinutes(
        sanitizedData.Start,
        sanitizedData.End
      );

      data.push(sanitizedData);
      await savePlannedDowntime(data);

      res.status(201).json(sanitizedData);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  })
);

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
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const id = req.params.id;
      const data = await loadPlannedDowntime();
      const index = data.findIndex((item) => item.ID === id);

      if (index !== -1) {
        const sanitizedData = validateAndSanitizeDowntime(req.body);

        // ID beibehalten
        sanitizedData.ID = id;

        // Datumsfelder formatieren
        sanitizedData.Start = formatDate(sanitizedData.Start);
        sanitizedData.End = formatDate(sanitizedData.End);

        // Dauer in Minuten neu berechnen
        sanitizedData.durationInMinutes = calculateDurationInMinutes(
          sanitizedData.Start,
          sanitizedData.End
        );

        data[index] = { ...data[index], ...sanitizedData };
        await savePlannedDowntime(data);

        res.status(200).json(data[index]);
      } else {
        res.status(404).json({ message: "Geplante Stillstandszeit nicht gefunden" });
      }
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  })
);

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
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const id = req.params.id;
      const data = await loadPlannedDowntime();
      const filteredData = data.filter((item) => item.ID !== id);

      if (filteredData.length < data.length) {
        await savePlannedDowntime(filteredData);
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Geplante Stillstandszeit nicht gefunden" });
      }
    } catch (error) {
      res.status(500).json({ message: "Fehler beim Löschen der geplanten Stillstandszeit" });
    }
  })
);

module.exports = router;

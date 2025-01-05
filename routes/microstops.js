const express = require('express');
const router = express.Router(); // Initialisiere den Router

// Importiere die Microstop-Services
const { 
  loadMicrostops, 
  loadMicrostopById, 
  createMicrostop, 
  updateMicrostop, 
  deleteMicrostop 
} = require('../services/microstopService');

/**
 * @swagger
 * components:
 *   schemas:
 *     Microstop:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Eindeutiger Identifikator des Microstops
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: Startzeit des Microstops
 *         endTime:
 *           type: string
 *           format: date-time
 *           description: Endzeit des Microstops
 *         reason:
 *           type: string
 *           description: Grund des Microstops
 *     MicrostopInput:
 *       type: object
 *       properties:
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: Startzeit des neuen Microstops
 *         endTime:
 *           type: string
 *           format: date-time
 *           description: Endzeit des neuen Microstops
 *         reason:
 *           type: string
 *           description: Grund des neuen Microstops
 */


/**
 * @swagger
 * tags:
 *   name: Microstops
 *   description: API zur Verwaltung der Microstop-Daten
 */

// GET Route: Alle Microstops abrufen
/**
 * @swagger
 * /microstops:
 *   get:
 *     summary: Alle Microstop-Daten abrufen
 *     tags: [Microstops]
 *     responses:
 *       200:
 *         description: Eine Liste von Microstop-Daten
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Microstop'
 */
router.get("/", async (req, res) => {
  try {
    const microstops = await loadMicrostops();
    res.status(200).json(microstops);
  } catch (error) {
    console.error("Fehler beim Abrufen der Microstop-Daten:", error);
    res.status(500).json({ message: "Fehler beim Abrufen der Microstop-Daten" });
  }
});

// GET Route: Einen Microstop nach ID abrufen
/**
 * @swagger
 * /microstops/{id}:
 *   get:
 *     summary: Ein Microstop nach ID abrufen
 *     tags: [Microstops]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die ID des Microstops
 *     responses:
 *       200:
 *         description: Der Microstop mit der angegebenen ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Microstop'
 *       404:
 *         description: Microstop nicht gefunden
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const microstop = await loadMicrostopById(id);
    if (!microstop) {
      return res.status(404).json({ message: "Microstop nicht gefunden" });
    }
    res.status(200).json(microstop);
  } catch (error) {
    res.status(500).json({ message: "Fehler beim Abrufen des Microstops" });
  }
});

// POST Route: Einen neuen Microstop hinzufügen
/**
 * @swagger
 * /microstops:
 *   post:
 *     summary: Einen neuen Microstop hinzufügen
 *     tags: [Microstops]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MicrostopInput'
 *     responses:
 *       201:
 *         description: Microstop erfolgreich hinzugefügt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Microstop'
 *       400:
 *         description: Ungültige Eingabedaten
 */
router.post("/", async (req, res) => {
  try {
    const microstopData = req.body;
    const newMicrostop = await createMicrostop(microstopData);
    res.status(201).json(newMicrostop);
  } catch (error) {
    res.status(400).json({ message: "Fehler beim Erstellen des Microstops" });
  }
});

// PUT Route: Einen bestehenden Microstop aktualisieren
/**
 * @swagger
 * /microstops/{id}:
 *   put:
 *     summary: Einen bestehenden Microstop aktualisieren
 *     tags: [Microstops]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die ID des zu aktualisierenden Microstops
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MicrostopInput'
 *     responses:
 *       200:
 *         description: Microstop erfolgreich aktualisiert
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Microstop'
 *       404:
 *         description: Microstop nicht gefunden
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  try {
    const updatedMicrostop = await updateMicrostop(id, updatedData);
    if (!updatedMicrostop) {
      return res.status(404).json({ message: "Microstop nicht gefunden" });
    }
    res.status(200).json(updatedMicrostop);
  } catch (error) {
    res.status(400).json({ message: "Fehler beim Aktualisieren des Microstops" });
  }
});

// DELETE Route: Einen Microstop löschen
/**
 * @swagger
 * /microstops/{id}:
 *   delete:
 *     summary: Einen Microstop löschen
 *     tags: [Microstops]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die ID des zu löschenden Microstops
 *     responses:
 *       204:
 *         description: Microstop erfolgreich gelöscht
 *       404:
 *         description: Microstop nicht gefunden
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await deleteMicrostop(id);
    if (result) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: "Microstop nicht gefunden" });
    }
  } catch (error) {
    res.status(500).json({ message: "Fehler beim Löschen des Microstops" });
  }
});

module.exports = router;

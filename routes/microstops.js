const express = require('express');
const router = express.Router(); // Initialisiere den Router
/**
 * @file microstops.js
 * @description This file contains the route handlers for microstops.
 * It imports the necessary services to load, create, update, and delete microstops.
 * 
 * @module routes/microstops
 */

const { 
  loadMicrostops, 
  loadMicrostopById, 
  createMicrostop, 
  updateMicrostop, 
  deleteMicrostop 
} = require('../services/microstopService'); // Importiere die Microstop-Services

/**
 * @swagger
 * tags:
 *   name: Microstops
 *   description: API zur Verwaltung der Microstop-Daten
 */

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
    const microstops = await loadMicrostops(); // Abrufen der Microstop-Daten
    res.status(200).json(microstops); // Rückgabe der Microstop-Daten
  } catch (error) {
    console.error("Fehler beim Abrufen der Microstop-Daten:", error);
    res.status(500).json({ message: "Fehler beim Abrufen der Microstop-Daten" });
  }
});

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
    const microstop = await loadMicrostopById(id); // Abrufen des Microstop anhand der ID
    if (!microstop) {
      return res.status(404).json({ message: "Microstop nicht gefunden" });
    }
    res.status(200).json(microstop); // Rückgabe des gefundenen Microstops
  } catch (error) {
    res.status(500).json({ message: "Fehler beim Abrufen des Microstops" });
  }
});

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
    const microstopData = req.body; // Daten aus dem Request-Body
    const newMicrostop = await createMicrostop(microstopData); // Erstellen eines neuen Microstops
    res.status(201).json(newMicrostop); // Rückgabe des erstellten Microstops
  } catch (error) {
    res.status(400).json({ message: "Fehler beim Erstellen des Microstops" });
  }
});

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
  const updatedData = req.body; // Die aktualisierten Daten
  try {
    const updatedMicrostop = await updateMicrostop(id, updatedData); // Aktualisieren des Microstops
    res.status(200).json(updatedMicrostop); // Rückgabe des aktualisierten Microstops
  } catch (error) {
    res.status(400).json({ message: "Fehler beim Aktualisieren des Microstops" });
  }
});

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
    const result = await deleteMicrostop(id); // Löschen des Microstops
    if (result) {
      res.status(204).send(); // Erfolgreiches Löschen
    } else {
      res.status(404).json({ message: "Microstop nicht gefunden" });
    }
  } catch (error) {
    res.status(500).json({ message: "Fehler beim Löschen des Microstops" });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router(); // Der Router wird hier korrekt initialisiert
/**
 * Module dependencies.
 * @module routes/tact
 * @requires ../services/tactService
 */

/**
 * Load all tacts.
 * @function
 * @name loadTacts
 * @memberof module:routes/tact
 */

/**
 * Load a specific tact by ID.
 * @function
 * @name loadTactById
 * @memberof module:routes/tact
 * @param {string} id - The ID of the tact to load.
 */

/**
 * Create a new tact.
 * @function
 * @name createTact
 * @memberof module:routes/tact
 * @param {Object} tactData - The data for the new tact.
 */

/**
 * Update an existing tact.
 * @function
 * @name updateTact
 * @memberof module:routes/tact
 * @param {string} id - The ID of the tact to update.
 * @param {Object} tactData - The updated data for the tact.
 */

/**
 * Delete a specific tact.
 * @function
 * @name deleteTact
 * @memberof module:routes/tact
 * @param {string} id - The ID of the tact to delete.
 */
const { 
  loadTacts, 
  loadTactById, 
  createTact, 
  updateTact, 
  deleteTact 
} = require('../services/tactService');

/**
 * @swagger
 * tags:
 *   name: Tacts
 *   description: API zur Verwaltung der Takt-Daten
 */

/**
 * @swagger
 * /tacts:
 *   get:
 *     summary: Alle Takt-Daten abrufen
 *     tags: [Tacts]
 *     responses:
 *       200:
 *         description: Eine Liste von Takt-Daten
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tact'
 */
router.get("/", async (req, res) => {
  try {
    const tacts = await loadTacts();
    res.status(200).json(tacts);
  } catch (error) {
    console.error("Fehler beim Abrufen der Takt-Daten:", error);
    res.status(500).json({ message: "Fehler beim Abrufen der Takt-Daten" });
  }
});

/**
 * @swagger
 * /tacts/{id}:
 *   get:
 *     summary: Ein Takt nach ID abrufen
 *     tags: [Tacts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die ID des Takts
 *     responses:
 *       200:
 *         description: Der Takt mit der angegebenen ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tact'
 *       404:
 *         description: Takt nicht gefunden
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const tact = await loadTactById(id);
    if (!tact) {
      return res.status(404).json({ message: "Takt nicht gefunden" });
    }
    res.status(200).json(tact);
  } catch (error) {
    res.status(500).json({ message: "Fehler beim Abrufen des Takts" });
  }
});

/**
 * @swagger
 * /tacts:
 *   post:
 *     summary: Einen neuen Takt hinzufügen
 *     tags: [Tacts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TactInput'
 *     responses:
 *       201:
 *         description: Takt erfolgreich hinzugefügt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tact'
 *       400:
 *         description: Ungültige Eingabedaten
 */
router.post("/", async (req, res) => {
  try {
    const tactData = req.body;
    const newTact = await createTact(tactData);
    res.status(201).json(newTact);
  } catch (error) {
    res.status(400).json({ message: "Fehler beim Erstellen des Takts" });
  }
});

/**
 * @swagger
 * /tacts/{id}:
 *   put:
 *     summary: Einen bestehenden Takt aktualisieren
 *     tags: [Tacts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die ID des zu aktualisierenden Takts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TactInput'
 *     responses:
 *       200:
 *         description: Takt erfolgreich aktualisiert
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tact'
 *       404:
 *         description: Takt nicht gefunden
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  try {
    const updatedTact = await updateTact(id, updatedData);
    res.status(200).json(updatedTact);
  } catch (error) {
    res.status(400).json({ message: "Fehler beim Aktualisieren des Takts" });
  }
});

/**
 * @swagger
 * /tacts/{id}:
 *   delete:
 *     summary: Einen Takt löschen
 *     tags: [Tacts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die ID des zu löschenden Takts
 *     responses:
 *       204:
 *         description: Takt erfolgreich gelöscht
 *       404:
 *         description: Takt nicht gefunden
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await deleteTact(id);
    if (result) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: "Takt nicht gefunden" });
    }
  } catch (error) {
    res.status(500).json({ message: "Fehler beim Löschen des Takts" });
  }
});

module.exports = router;

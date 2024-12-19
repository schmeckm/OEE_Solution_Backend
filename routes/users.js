const express = require('express');
const router = express.Router(); // Der Router wird hier korrekt initialisiert
const { 
  loadUsers,
  loadUserById,
  createUser,
  updateUser,
  deleteUser,
} = require('../services/userService'); // Richtiges Importieren der Funktionen aus dem Service

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: API zur Verwaltung der User-Daten
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Alle User-Daten abrufen
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Eine Liste von User-Daten
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.get("/", async (req, res) => {
  try {
    const users = await loadUsers();  // Richtige Funktion zum Abrufen der User-Daten
    res.status(200).json(users);
  } catch (error) {
    console.error("Fehler beim Abrufen der User-Daten:", error);
    res.status(500).json({ message: "Fehler beim Abrufen der User-Daten" });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Ein User nach ID abrufen
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die ID des Users
 *     responses:
 *       200:
 *         description: Der User mit der angegebenen ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User nicht gefunden
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const user = await loadUserById(id);  // Richtige Funktion zum Abrufen eines Users anhand der ID
    if (!user) {
      return res.status(404).json({ message: "User nicht gefunden" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Fehler beim Abrufen des Users" });
  }
});

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Einen neuen User hinzufügen
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       201:
 *         description: User erfolgreich hinzugefügt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Ungültige Eingabedaten
 */
router.post("/", async (req, res) => {
  try {
    const userData = req.body;
    const newUser = await createUser(userData);  // Richtige Funktion zum Erstellen eines Users
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ message: "Fehler beim Erstellen des Users" });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Einen bestehenden User aktualisieren
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die ID des zu aktualisierenden Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       200:
 *         description: User erfolgreich aktualisiert
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User nicht gefunden
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  try {
    const updatedUser = await updateUser(id, updatedData);  // Richtige Funktion zum Aktualisieren eines Users
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(400).json({ message: "Fehler beim Aktualisieren des Users" });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Einen User löschen
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Die ID des zu löschenden Users
 *     responses:
 *       204:
 *         description: User erfolgreich gelöscht
 *       404:
 *         description: User nicht gefunden
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await deleteUser(id);  // Richtige Funktion zum Löschen eines Users
    if (result) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: "User nicht gefunden" });
    }
  } catch (error) {
    res.status(500).json({ message: "Fehler beim Löschen des Users" });
  }
});

module.exports = router;

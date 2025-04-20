// authRoutes.js
const express = require('express');
const router = express.Router();
const authService = require('../services/authService'); // Korrekter Pfad zum AuthService

/**
 * @module routes/auth
 * @requires express
 * @requires ../services/authService
 */

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: API for managing authentication
 */

/**
 * @swagger
 * /auth/google-login:
 *   post:
 *     summary: Logs in or creates a user with Google credentials.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: The ID token received from Google.
 *     responses:
 *       '200':
 *         description: User successfully logged in or created. Returns a JWT.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: The application JWT.
 *       '401':
 *         description: Invalid Google ID token.
 *       '500':
 *         description: Error during server-side processing.
 */
router.post('/google-login', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: 'Google ID token is missing' });
  }

  try {
    const googlePayload = await authService.verifyGoogleToken(idToken);
    if (!googlePayload) {
      return res.status(401).json({ message: 'Invalid Google ID token' });
    }

    const user = await authService.findOrCreateUser(googlePayload);
    const applicationToken = authService.generateApplicationToken(user);

    res.status(200).json({ token: applicationToken }); // Send back a JWT
  } catch (error) {
    console.error('Error during Google login:', error);
    res.status(500).json({ message: 'Error during Google login' });
  }
});

module.exports = router;

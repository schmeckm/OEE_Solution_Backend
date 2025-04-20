// services/authService.js
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const { User } = require('../models'); // Importiere dein User-Modell korrekt

/**
 * Verifies the Google ID token.
 * @param {string} idToken - The Google ID token.
 * @returns {Promise<object|null>} - The payload of the verified token or null on error.
 */

async function verifyGoogleToken(idToken) {
    console.log('Backend GOOGLE_CLIENT_ID zur Verifizierung:', process.env.GOOGLE_CLIENT_ID);
    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        return ticket.getPayload();
    } catch (error) {
        console.error('Error verifying Google ID token:', error);
        return null;
    }
}


/**
 * Finds a user by Google ID or creates a new user.
 * @param {object} googlePayload - The payload of the verified Google token.
 * @returns {Promise<object>} - The found or created user.
 */
async function findOrCreateUser(googlePayload) {
    try {
        // Versuche, einen Benutzer anhand der Google-ID zu finden
        let user = await User.findOne({ where: { googleId: googlePayload.sub } });

        if (!user) {
            // Benutzer nicht gefunden, erstelle einen neuen Benutzer
            const newUser = {
                username: googlePayload.email, // Verwende die E-Mail als Standard-Username
                email: googlePayload.email,
                firstName: googlePayload.given_name,
                lastName: googlePayload.family_name,
                googleId: googlePayload.sub,
                role: 'Standard'
                // Füge hier weitere Felder hinzu, die du speichern möchtest (z.B. role)
            };
            user = await User.create(newUser);
            console.log('Neuer Benutzer mit Google-Konto erstellt:', user);
        }
        return user;
    } catch (error) {
        console.error('Fehler beim Finden oder Erstellen des Benutzers:', error);
        throw error;
    }
}


/**
 * Generates an application-specific token or session for the user.
 * @param {object} user - The user.
 * @returns {string} - The generated token or session ID.
 */
function generateApplicationToken(user) {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '1h' }); // Verwende user.user_id
}

module.exports = {
    verifyGoogleToken,
    findOrCreateUser,
    generateApplicationToken,
};
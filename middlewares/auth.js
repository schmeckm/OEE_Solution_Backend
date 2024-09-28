const jwt = require('jsonwebtoken');

// Middleware zur Authentifizierung
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) return res.status(401).json({ message: 'Access Token Required' });

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid or Expired Token' });

        req.user = user; // Füge die Benutzerdaten zur Anfrage hinzu
        next();
    });
}

// Middleware zur Autorisierung basierend auf Rollen
function authorizeRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ message: 'Forbidden: You do not have the required role' });
        }
        next();
    };
}

module.exports = {
    authenticateToken,
    authorizeRole
};
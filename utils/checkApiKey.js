// middleware/checkApiKey.js

module.exports = (req, res, next) => {
    const apiKey = req.header('x-api-key');
    const clientIp = req.ip || req.connection.remoteAddress;

    // Liste von vertrauenswürdigen IPs für interne Anfragen
    const trustedIps = ['127.0.0.1', '::1', 'localhost', '::ffff:127.0.0.1'];

    // Prüfe, ob die Anfrage intern ist
    if (trustedIps.includes(clientIp) || clientIp === process.env.INTERNAL_IP) {
        return next(); // Zulassen, ohne den API-Key zu überprüfen
    }

    // Prüfe, ob der API-Schlüssel gesetzt ist
    if (apiKey && apiKey === process.env.API_KEY) {
        return next(); // API-Key ist korrekt
    }

    // API-Key fehlt oder ist falsch
    return res.status(401).json({ error: 'Unauthorized: Missing or incorrect API key' });
};
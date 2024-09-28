const nodemailer = require('nodemailer');
const winston = require('winston'); // Logging-Tool, z.B. winston

// Setup des Loggers
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}] - ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'email.log' }) // Loggt Fehler in eine Datei
    ]
});

// Überprüfen der Umgebungsvariablen
logger.info(`Email user: ${process.env.EMAIL_USER}`); // Sensitive information nur für Debugging
logger.info(`Email pass: ${process.env.EMAIL_PASS ? 'Passwort ist gesetzt' : 'Passwort fehlt'}`);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Funktion zum Senden von Willkommens-E-Mails
const sendWelcomeEmail = (email, firstName) => {
    console.log(`Sende Willkommens-E-Mail an ${email}`);
    console.log('First Name:', firstName);

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Willkommen in unserer Anwendung!',
        text: `Hallo ${firstName},\n\nVielen Dank für Ihre Registrierung bei uns! Wir freuen uns, Sie an Bord zu haben. Hier sind einige hilfreiche Ressourcen, um Ihnen den Einstieg zu erleichtern:\n\n- [Einstiegsanleitung](link-to-guide)\n- [Support-Seite](link-to-support)\n\nMit besten Grüßen,\nDas Team`,
    };

    return transporter.sendMail(mailOptions)
        .then(info => {
            console.log(`E-Mail erfolgreich gesendet an ${email}: ${info.response}`);
            return info;
        })
        .catch(error => {
            // Spezifischere Fehlermeldungen loggen
            if (error.responseCode === 535) {
                console.log(`Fehler beim Senden der E-Mail an ${email}: Falsche Anmeldedaten.`);
            } else if (error.code === 'ENOTFOUND') {
                console.log(`Fehler beim Senden der E-Mail an ${email}: SMTP-Server nicht gefunden.`);
            } else {
                console.log(`Fehler beim Senden der E-Mail an ${email}: ${error.message}`);
            }
            throw error; // Fehler weiterreichen, um extern behandelt zu werden
        });
};

module.exports = {
    sendWelcomeEmail,
};
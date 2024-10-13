const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config(); // Load environment variables

// Erstellen des Transporters
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'oeesolution@gmail.com',
        pass: 'ysgl ylns upvx qqne',
    },
    tls: {
        rejectUnauthorized: false,
    },
});

// Funktion zur Erstellung des E-Mail-Inhalts
const createWelcomeEmail = (firstName) => {
    return `
        <p>Hallo ${firstName},</p>
        <p>Vielen Dank für Ihre Registrierung bei uns! Hier ist ein Bild:</p>
        <img src="cid:welcomeImage" alt="Welcome Image" style="max-width: 20%; height: auto;">
        <p>Was ist OEE (Overall Equipment Effectiveness)?</p>
        <p>
            OEE ist eine Kennzahl, die die Effizienz von Produktionsanlagen misst. Sie wird verwendet, um die Verfügbarkeit, Leistung und Qualität eines Produktionsprozesses zu bewerten. 
            OEE hilft dabei, Verlustquellen zu identifizieren und die Produktionsleistung zu verbessern. Eine höhere OEE bedeutet, dass eine Anlage effizienter arbeitet, was zu 
            geringeren Kosten und höheren Gewinnen führt.
        </p>
        <p>Mit besten Grüßen,<br>Das Team</p>
    `;
};

// Funktion zum Senden von Willkommens-E-Mails
const sendWelcomeEmail = async(email, firstName) => {
    if (!validateEmail(email)) {
        console.error(`Ungültige E-Mail-Adresse: ${email}`);
        return;
    }

    console.log(`Sende Willkommens-E-Mail an ${email}`);

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Willkommen in unserer Anwendung!',
        text: `Hallo ${firstName}, vielen Dank für Ihre Registrierung bei uns!`,
        html: createWelcomeEmail(firstName),
        attachments: [{
            filename: 'welcome.png', // Name of the file in the email
            path: path.join(__dirname, 'welcome.png'), // Path to the image file
            cid: 'welcomeImage' // This is the content ID used in the HTML
        }]
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`E-Mail erfolgreich gesendet an ${email}: ${info.response}`);
    } catch (error) {
        handleEmailError(error, email);
    }
};

// Funktion zur Validierung der E-Mail-Adresse
const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

// Funktion zur Verarbeitung von E-Mail-Fehlern
const handleEmailError = (error, email) => {
    console.error(`Fehler beim Senden der E-Mail an ${email}:`, error);
};

// Test the function
const testEmail = 'markus.schmeckenbecher@gmail.com'; // Replace with a valid recipient email
const testName = 'Markus Schmeckenbecher'; // Replace with a test first name

//sendWelcomeEmail(testEmail, testName);
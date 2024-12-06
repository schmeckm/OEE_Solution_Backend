// testDatabaseConnection.js

const { sequelize, ProcessOrder } = require('./models'); // Der Pfad sollte korrekt sein, je nachdem, wo sich die models-Datei befindet

// Teste die Datenbankverbindung
sequelize.authenticate()
    .then(() => {
        console.log('✅ Datenbankverbindung erfolgreich.');
    })
    .catch(err => {
        console.error('❌ Datenbankverbindung fehlgeschlagen:', err);
    });

// Testen, ob das Modell funktioniert
ProcessOrder.findAll().then(orders => {
    console.log('Process Orders:', orders);
}).catch(err => {
    console.error('Fehler beim Abrufen der Prozessaufträge:', err);
});

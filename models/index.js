const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Laden der Umgebungsvariablen
dotenv.config({ path: path.resolve(__dirname, '../.env.development') });

const databaseUrl = process.env.DATABASE_URL;
console.log(`DATABASE_URL: ${databaseUrl}`);

// Initialisieren der Sequelize-Instanz
const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false, // Setze auf true, wenn du SQL-Abfragen sehen möchtest
});

// Testen der Datenbankverbindung
sequelize.authenticate()
    .then(() => {
        console.log('✅ Datenbankverbindung erfolgreich.');
    })
    .catch(err => {
        console.error('❌ Datenbankverbindung fehlgeschlagen:', err);
    });

// Modelle importieren
const models = {};
const modelsPath = path.join(__dirname);

// Alle Modelldateien im Verzeichnis durchlaufen
fs.readdirSync(modelsPath)
    .filter(file => file !== 'index.js' && file.endsWith('.js'))
    .forEach(file => {
        const modelPath = path.join(modelsPath, file);
        const requiredModule = require(modelPath);

        if (typeof requiredModule !== 'function') {
            throw new TypeError(`Model file ${file} does not export a function`);
        }

        // Hier wird das Modell initialisiert
        const model = requiredModule(sequelize, Sequelize.DataTypes);
        models[model.name] = model;
    });

// Falls Assoziationen definiert sind, diese ebenfalls initialisieren
Object.keys(models).forEach(modelName => {
    if (models[modelName].associate) {
        models[modelName].associate(models);
    }
});

// Exportiere die Sequelize-Instanz und alle Modelle
module.exports = { sequelize, ...models };

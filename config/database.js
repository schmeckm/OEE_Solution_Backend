// config/database.js oder models/index.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false, // Deaktiviert SQL-Logging in der Konsole
  dialectOptions: {
    ssl: process.env.USE_HTTPS === 'true', // SSL verwenden, wenn USE_HTTPS auf true gesetzt ist
  },
});

sequelize
  .authenticate()
  .then(() => {
    console.log('Die Verbindung zur Datenbank wurde erfolgreich hergestellt.');
  })
  .catch((err) => {
    console.error('Fehler beim Verbinden mit der Datenbank:', err);
  });

module.exports = sequelize;

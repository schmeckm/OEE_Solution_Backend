const { Sequelize, DataTypes } = require('sequelize');

// Hier wird das Modell für den User exportiert
module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        user_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,   // Primärschlüssel
            autoIncrement: true,   // Automatische Erhöhung
            field: 'user_id'   // Der Name der Spalte in der Datenbank
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,   // Sicherstellen, dass der Benutzername einzigartig ist
            field: 'username'   // Der Name der Spalte in der Datenbank
        },
        password: {
            type: DataTypes.STRING,
            allowNull: true,   // Passwort ist optional für Benutzer ohne Passwort (z. B. bei Google-Login)
            field: 'password'   // Der Name der Spalte in der Datenbank
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'role'   // Der Name der Spalte in der Datenbank
        },
        salutation: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'salutation'   // Der Name der Spalte in der Datenbank
        },
        firstName: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'firstname'   // Der Name der Spalte in der Datenbank
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,   // Sicherstellen, dass die E-Mail-Adresse einzigartig ist
            field: 'email'   // Der Name der Spalte in der Datenbank
        },
        googleId: { // Neues Feld für die Google-Benutzer-ID
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,   // Sicherstellen, dass jede Google-ID nur einem Benutzer gehört
            field: 'google_id' // Der Name der Spalte in der Datenbank
        },
        lastName: { // Neues Feld für den Nachnamen
            type: DataTypes.STRING,
            allowNull: true,
            field: 'lastname' // Der Name der Spalte in der Datenbank
        }
    }, {
        tableName: 'users',   // Der Name der Tabelle in der Datenbank
        timestamps: false,   // Keine `createdAt` oder `updatedAt` Felder
    });

    return User;   // Das Modell wird zurückgegeben
};
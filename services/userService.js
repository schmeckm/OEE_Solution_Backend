const fs = require('fs');
const path = require('path');

// Pfad zur JSON-Datei
const usersFilePath = path.join(__dirname, '../data/users.json');

// Funktion zum Laden der Benutzer
function loadUsers() {
    const data = fs.readFileSync(usersFilePath, 'utf8');
    return JSON.parse(data);
}

// Funktion zum Speichern der Benutzer
function saveUsers(users) {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
}

module.exports = {
    loadUsers,
    saveUsers
};
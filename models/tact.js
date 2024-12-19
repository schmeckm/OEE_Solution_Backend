const { Sequelize, DataTypes } = require('sequelize');

// Hier wird das Modell für das Tact exportiert
module.exports = (sequelize) => {
    const Tact = sequelize.define('Tact', {
        tact_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
            field: 'tact_id'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        workcenter_id: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'workcenter_id'  // "machine" in der Datenbank
        },
        material: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'material'  // "material" in der Datenbank
        },
        sollMax: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'sollmax'  // "sollMax" in der Datenbank
        },
        sollMin: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'sollmin'  // "sollMin" in der Datenbank
        }
    }, {
        tableName: 'tact',  // Der Name der Tabelle in der Datenbank
        timestamps: false,  // Keine `createdAt` oder `updatedAt` Felder
    });

    return Tact;  // Das Modell muss zurückgegeben werden
};

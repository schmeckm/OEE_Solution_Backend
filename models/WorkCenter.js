const { Sequelize, DataTypes } = require('sequelize');

// Hier wird das Modell für das WorkCenter exportiert
module.exports = (sequelize) => {
    const WorkCenter = sequelize.define('WorkCenter', {
        workcenter_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
            field: 'workcenter_id'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        plant: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'plant'  // Hier wird "Plant" als Modellname verwendet, aber die Spalte heißt "plant"
        },
        area: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'area'  // "area" in der Datenbank
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'machine_name'  // Hier wird "name" im Modell verwendet, aber die Spalte heißt "machine_name"
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'description'  // "description" in der Datenbank
        },
        OEE: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            field: 'oee'  // "oee" in der Datenbank
        }
    }, {
        tableName: 'work_centers',  // Der Name der Tabelle in der Datenbank
        timestamps: false,  // Keine `createdAt` oder `updatedAt` Felder
    });

    return WorkCenter;  // Das Modell muss zurückgegeben werden
};

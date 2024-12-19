const { Sequelize, DataTypes } = require('sequelize');

// Hier wird das Modell für UnplannedDowntime exportiert
module.exports = (sequelize) => {
    const UnplannedDowntime = sequelize.define('UnplannedDowntime', {
        plannedOrder_ID: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
            field: 'plannedorder_id'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        start_date: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'start_date'  // "start_date" in der Datenbank
        },
        end_date: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'end_date'  // "end_date" in der Datenbank
        },
        order_id: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'order_id'  // "order_id" in der Datenbank
        },
        workcenter_id: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'workcenter_id'  // "workcenter_id" in der Datenbank
        },
        durationInMinutes: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'duration_minutes'  // "duration_inminutes" in der Datenbank
        },
    }, {
        tableName: 'unplanned_downtime',  // Der Name der Tabelle in der Datenbank
        timestamps: false,  // Keine `createdAt` oder `updatedAt` Felder
    });

    return UnplannedDowntime;  // Das Modell muss zurückgegeben werden
};

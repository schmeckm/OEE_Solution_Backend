const { Sequelize, DataTypes } = require('sequelize');

// Hier wird das Modell für PlannedDowntime exportiert
module.exports = (sequelize) => {
    const PlannedDowntime = sequelize.define('PlannedDowntime', {
        plannedOrder_ID: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
            field: 'plannedorder_id'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        Start: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'start_date'  // "start_date" in der Datenbank
        },
        End: {
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
        tableName: 'planned_downtime',  // Der Name der Tabelle in der Datenbank
        timestamps: false,  // Keine `createdAt` oder `updatedAt` Felder
    });

    return PlannedDowntime;  // Das Modell muss zurückgegeben werden
};

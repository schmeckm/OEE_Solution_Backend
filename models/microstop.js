const { Sequelize, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Microstop = sequelize.define('Microstop', {
        Microstop_ID: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
            field: 'microstop_id'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        Order_ID: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'order_id'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        start_date: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'start_date'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        end_date: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'end_date'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        Reason: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'reason'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        Differenz: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'differenz'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        workcenter_id: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'workcenter_id'  // Der tatsächliche Name der Spalte in der Datenbank
        }
    }, {
        tableName: 'microstops',  // Der Name der Tabelle in der Datenbank
        timestamps: false,  // Keine `createdAt` oder `updatedAt` Felder
    });

    return Microstop;  // Das Modell muss zurückgegeben werden
};

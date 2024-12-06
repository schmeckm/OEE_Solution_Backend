const { Sequelize, DataTypes } = require('sequelize');

// Das Sequelize-Objekt wird durch den Import aus index.js bereitgestellt
module.exports = (sequelize) => {
    const ProcessOrder = sequelize.define('ProcessOrder', {
        order_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
            field: 'order_id'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        processordernumber: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'processorder_number'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        materialnumber: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'material_number'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        materialdescription: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'material_description'  // Der tatsächliche Name der Spalte in der Datenbank
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
        setuptime: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'setup_time'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        processingtime: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'processing_time'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        teardowntime: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'tear_downtime'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        plannedproductionquantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'planned_production_quantity'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        confirmedproductionyield: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'confirmed_production_yield'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        confirmedproductionquantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'confirmed_production_quantity'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        targetperformance: {
            type: DataTypes.FLOAT,
            allowNull: false,
            field: 'target_performance'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        workcenter_id: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'workcenter_id'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        processorderstatus: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'processorder_status'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        actualprocessorderstart: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'actual_processorder_start'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        actualprocessorderend: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'actual_processorder_end'  // Der tatsächliche Name der Spalte in der Datenbank
        },
        machinename: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'machine_name'  // Der tatsächliche Name der Spalte in der Datenbank
        }
    }, {
        tableName: 'process_orders',  // Der Name der Tabelle in der Datenbank
        timestamps: false, // Keine `createdAt` und `updatedAt` Felder
    });

    return ProcessOrder;
};

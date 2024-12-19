const { Sequelize, DataTypes } = require('sequelize');

// Define the ShiftModel schema
module.exports = (sequelize) => {
    const ShiftModel = sequelize.define('ShiftModel', {
        shift_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
            field: 'shift_id'
        },
        workcenter_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: DataTypes.UUIDV4,
            field: 'workcenter_id'  // Database column name
        },
        shift_name: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'shift_name'  // Database column name
        },
        shift_start_time: {
            type: DataTypes.TIME,
            allowNull: false,
            field: 'shift_start_time'  // Database column name
        },
        shift_end_time: {
            type: DataTypes.TIME,
            allowNull: false,
            field: 'shift_end_time'  // Database column name
        },
        break_start: {
            type: DataTypes.TIME,
            allowNull: false,
            field: 'break_start'  // Database column name
        },
        break_end: {
            type: DataTypes.TIME,
            allowNull: false,
            field: 'break_end'  // Database column name
        },
    }, {
        tableName: 'shiftmodel',  // Database table name
        timestamps: false,  // No `createdAt` or `updatedAt` columns
    });

    return ShiftModel;  // Return the model definition
};

const { Sequelize, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        user_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'user_id'
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            field: 'username'
        },
        password: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'password'
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'role'
        },
        salutation: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'salutation'
        },
        firstName: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'firstname'
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
            field: 'email'
        },
        googleId: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
            field: 'google_id'
        },
        lastName: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'lastname'
        },

        picture: {
            type: DataTypes.STRING,
            allowNull: true, 
            field: 'picture' 
        }
    }, {
        tableName: 'users',
        timestamps: false,
    });

    return User;
};
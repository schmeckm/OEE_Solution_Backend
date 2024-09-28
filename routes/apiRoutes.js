const express = require("express");
const passport = require('passport'); // Für die Google OAuth-Authentifizierung

// OEE Routes
const machinesRouter = require("./machines");
const plannedDowntimeRouter = require("./plannedDowntime");
const processOrdersRouter = require("./processOrders");
const shiftModelRouter = require("./shiftModels");
const unplannedDowntimeRouter = require("./unplannedDowntime");
const oeeConfigRouter = require("./oeeConfig");
const microStopsRouter = require("./microstops");

const userRouter = require("./users");
const topicsRouter = require("./topics");
const ratingsRouter = require("./ratings");
const microstopMachineAggregationRouter = require("./microstopByMachine");
const microstopProcessOrderAggregationRouter = require("./microstopByProcessOrder");
const settingRouter = require("./settings");

// Additional Routes
const structureRouter = require("./structure");
const oeeLogsRouter = require("./oeeLogs");
const calculateOEERouter = require("./calculateOEE");
const oeeMetricsRouter = require("./oeeMetricsRoutes");
const prepareOEERouter = require("./prepareOEE");
const oeeDataRouter = require("./oeeRoutes");
const tactRouter = require('./tact');

/**
 * Registers the API routes with the provided Express application.
 *
 * @param {express.Express} app - The Express application instance.
 */
function registerApiRoutes(app) {

    // OEE API Endpoints for OEE Data
    app.use("/api/v1/machines", machinesRouter);
    app.use("/api/v1/planneddowntime", plannedDowntimeRouter);
    app.use("/api/v1/processorders", processOrdersRouter);
    app.use("/api/v1/shiftmodels", shiftModelRouter);
    app.use("/api/v1/unplanneddowntime", unplannedDowntimeRouter);
    app.use("/api/v1/oeeconfig", oeeConfigRouter);
    app.use("/api/v1/microstops", microStopsRouter);

    // Register microstop aggregation routes
    app.use(
        "/api/v1/microstop-aggregation/machine",
        microstopMachineAggregationRouter
    );
    app.use(
        "/api/v1/microstop-aggregation/process-order",
        microstopProcessOrderAggregationRouter
    ); // Aggregation by process order

    // Additional API Endpoints for Customing the OEE System
    app.use("/api/v1/structure", structureRouter);
    app.use("/api/v1/oee-logs", oeeLogsRouter);
    app.use("/api/v1/calculateOEE", calculateOEERouter);
    app.use("/api/v1/topics", topicsRouter);
    app.use("/api/v1/users", userRouter);
    app.use("/api/v1/ratings", ratingsRouter);
    app.use("/api/v1", oeeMetricsRouter);
    app.use("/api/v1/settings", settingRouter);
    app.use("/api/v1/prepareOEE", prepareOEERouter);
    app.use("/api/v1", oeeDataRouter);
    app.use('/api/v1/tact', tactRouter);

    // Google OAuth Routes for Frontenend Authentication
    app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
    app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
        res.redirect('/profile'); // Erfolgreiche Authentifizierung, Weiterleitung zur Profilseite
    });


    // Profil-Route
    app.get('/profile', (req, res) => {
        if (!req.isAuthenticated()) {
            return res.redirect('/');
        }

        // Log the user object to see if the profilePicture is included
        console.log(req.user);

        // Use the profilePicture from the user object or a default image
        const profilePicture = req.user.profilePicture || '/default-profile.png';

        res.send(`
            <h1>Hello, ${req.user.username}</h1>
            <p>Email: ${req.user.email}</p>
            <p>Role: ${req.user.role}</p>
            <img src="${profilePicture}" alt="Profile Picture" style="border-radius: 50%; width: 100px; height: 100px;" />
        `);
    });


    // Logout-Route
    app.get('/logout', (req, res) => {
        // Log out from your app
        req.logout(function(err) {
            if (err) {
                return next(err);
            }
            // Destroy the session
            req.session.destroy(function(err) {
                res.clearCookie('connect.sid'); // Clear the session cookie
                // Redirect to Google logout
                const googleLogoutURL = 'https://accounts.google.com/Logout?continue=https://appengine.google.com/_ah/logout?continue=http://localhost:3000/register.html';
                res.redirect(googleLogoutURL);
            });
        });
    });

}

module.exports = registerApiRoutes;